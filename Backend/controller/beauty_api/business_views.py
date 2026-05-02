"""
Beauty Business API Views
=========================
Protected REST endpoints used exclusively by the business provider portal.

All routes live under `/api/beauty/protected/business/` so the existing
`BeautyAuthMiddleware` enforces a valid signed cookie. Each handler
additionally requires `user_type == 'business'`, otherwise it returns
HTTP 403 — customers can never accidentally hit a business endpoint.

Storefront link
---------------
A `BusinessProvider` (auth account) is linked to a `BeautyProvider`
(public storefront) via `BeautyProvider.business_provider_id`. The
helper `_require_business_storefront` resolves both in one place and
auto-provisions a storefront on first access so the portal works
immediately after sign-up.
"""

from datetime import datetime, timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .availability_service import (
    ensure_storefront,
    get_weekly_hours,
    replace_weekly_hours,
)
from .calendar_stats_service import compute_month_payload
from .models import (
    BeautyBooking,
    BeautyProvider,
    BeautyService,
    BeautySession,
    BusinessProvider,
    BusinessProviderApplication,
)


VALID_CATEGORIES = {c[0] for c in BeautyService.CATEGORY_CHOICES}
VALID_TOOLS = {'google_calendar', 'icloud', 'outlook', 'square', 'mindbody', 'vagaro'}


def _require_business_storefront(request) -> tuple[BusinessProvider | None, BeautyProvider | None, Response | None]:
    """
    Returns (business_provider, storefront, error_response).
    On success error_response is None. On failure the other two are None.
    """
    user_id = getattr(request, 'beauty_user_id', None)
    user_type = getattr(request, 'beauty_user_type', None)
    if user_type != BeautySession.USER_TYPE_BUSINESS or not user_id:
        return None, None, Response(
            {'detail': 'Business providers only.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        business = BusinessProvider.objects.get(id=user_id)
    except BusinessProvider.DoesNotExist:
        return None, None, Response(
            {'detail': 'Business account not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    storefront = ensure_storefront(business)
    return business, storefront, None


def _service_to_dict(svc: BeautyService) -> dict:
    return {
        'id': svc.id,
        'name': svc.name,
        'description': svc.description,
        'category': svc.category,
        'price_cents': svc.price_cents,
        'duration_minutes': svc.duration_minutes,
    }


class BusinessDashboardView(APIView):
    """GET /api/beauty/protected/business/dashboard/ — quick stats."""

    def get(self, request):
        _, storefront, err = _require_business_storefront(request)
        if err:
            return err
        now = datetime.now(timezone.utc)
        all_bookings = BeautyBooking.objects.filter(service__provider=storefront)
        upcoming = all_bookings.filter(
            status=BeautyBooking.STATUS_BOOKED,
            slot_at__gt=now,
        ).count()
        # cancelled_immediate bookings are treated as never-happened, so they
        # don't count toward total bookings either.
        all_bookings = all_bookings.exclude(
            status=BeautyBooking.STATUS_CANCELLED_IMMEDIATE,
        )
        services_count = BeautyService.objects.filter(provider=storefront).count()
        return Response(
            {
                'storefront': {
                    'id': storefront.id,
                    'name': storefront.name,
                    'short_description': storefront.short_description,
                    'location_label': storefront.location_label,
                },
                'stats': {
                    'services_count': services_count,
                    'upcoming_bookings': upcoming,
                    'total_bookings': all_bookings.count(),
                },
            },
            status=status.HTTP_200_OK,
        )


class BusinessServiceListView(APIView):
    """
    GET  /api/beauty/protected/business/services/  — list this storefront's services.
    POST /api/beauty/protected/business/services/  — create a new service.
    """

    def get(self, request):
        _, storefront, err = _require_business_storefront(request)
        if err:
            return err
        services = list(storefront.services.all().order_by('category', 'name'))
        return Response(
            {'services': [_service_to_dict(s) for s in services]},
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        _, storefront, err = _require_business_storefront(request)
        if err:
            return err
        cleaned, error = _clean_service_payload(request.data)
        if error:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)
        svc = BeautyService.objects.create(provider=storefront, **cleaned)
        return Response(_service_to_dict(svc), status=status.HTTP_201_CREATED)


class BusinessServiceDetailView(APIView):
    """
    PUT    /api/beauty/protected/business/services/<id>/ — edit.
    DELETE /api/beauty/protected/business/services/<id>/ — remove.
    """

    def _load(self, request, service_id):
        _, storefront, err = _require_business_storefront(request)
        if err:
            return None, err
        try:
            svc = BeautyService.objects.get(id=service_id, provider=storefront)
        except BeautyService.DoesNotExist:
            return None, Response({'detail': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)
        return svc, None

    def put(self, request, service_id):
        svc, err = self._load(request, service_id)
        if err:
            return err
        cleaned, error = _clean_service_payload(request.data)
        if error:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)
        for k, v in cleaned.items():
            setattr(svc, k, v)
        svc.save()
        return Response(_service_to_dict(svc), status=status.HTTP_200_OK)

    def delete(self, request, service_id):
        svc, err = self._load(request, service_id)
        if err:
            return err
        # PROTECT FK from BeautyBooking → cancel any future bookings first.
        # Business is removing the service, so any active bookings are
        # business-side cancellations (refund owed).
        future_bookings = BeautyBooking.objects.filter(
            service=svc, status=BeautyBooking.STATUS_BOOKED,
        )
        # TODO: trigger Stripe refund for each cancelled booking.
        future_bookings.update(status=BeautyBooking.STATUS_CANCELLED_BY_BUSINESS)
        # If past completed/cancelled bookings still reference it, the FK
        # blocks deletion — soft-delete by zeroing duration is overkill, so
        # we just refuse and ask the owner to keep it.
        try:
            svc.delete()
        except Exception:
            return Response(
                {'detail': 'Service has historical bookings and cannot be removed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'deleted': True}, status=status.HTTP_200_OK)


def _clean_service_payload(data) -> tuple[dict, str | None]:
    name = (data.get('name') or '').strip()
    if not name:
        return {}, 'Name is required.'
    category = (data.get('category') or '').strip().lower()
    if category not in VALID_CATEGORIES:
        return {}, 'Choose a valid category.'
    description = (data.get('description') or '').strip()
    try:
        price_cents = int(data.get('price_cents') or 0)
    except (TypeError, ValueError):
        return {}, 'Price must be a whole number of cents.'
    if price_cents < 0:
        return {}, 'Price must be zero or positive.'
    try:
        duration_minutes = int(data.get('duration_minutes') or 60)
    except (TypeError, ValueError):
        return {}, 'Duration must be a whole number of minutes.'
    if duration_minutes < 15 or duration_minutes > 480:
        return {}, 'Duration must be between 15 and 480 minutes.'
    return {
        'name': name[:255],
        'category': category,
        'description': description[:255],
        'price_cents': price_cents,
        'duration_minutes': duration_minutes,
    }, None


class BusinessAvailabilityView(APIView):
    """
    GET /api/beauty/protected/business/availability/ — 7 weekly rows.
    PUT /api/beauty/protected/business/availability/ — replace all 7 rows.
    """

    def get(self, request):
        _, storefront, err = _require_business_storefront(request)
        if err:
            return err
        return Response({'weekly_hours': get_weekly_hours(storefront)}, status=status.HTTP_200_OK)

    def put(self, request):
        _, storefront, err = _require_business_storefront(request)
        if err:
            return err
        rows = request.data.get('weekly_hours') or []
        errors = replace_weekly_hours(storefront, rows)
        if errors:
            return Response({'detail': ' '.join(errors)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'weekly_hours': get_weekly_hours(storefront)}, status=status.HTTP_200_OK)


def _get_or_create_application(business: BusinessProvider) -> BusinessProviderApplication:
    app, _ = BusinessProviderApplication.objects.get_or_create(
        business_provider=business,
        defaults={'business_name': business.business_name},
    )
    return app


def _application_to_dict(app: BusinessProviderApplication) -> dict:
    return {
        'id': app.id,
        'status': app.status,
        'entity_type': app.entity_type,
        'itin_masked': ('***-**-' + app.itin[-4:]) if app.itin else '',
        'has_itin': bool(app.itin),
        'applicant_first_name': app.applicant_first_name,
        'applicant_last_name': app.applicant_last_name,
        'business_name': app.business_name,
        'address_line1': app.address_line1,
        'address_line2': app.address_line2,
        'city': app.city,
        'state': app.state,
        'postal_code': app.postal_code,
        'selected_categories': list(app.selected_categories or []),
        'third_party_tools': list(app.third_party_tools or []),
        'completed_steps': list(app.completed_steps or []),
        'tos_accepted': bool(app.tos_accepted_at),
        'submitted_at': app.submitted_at.isoformat() if app.submitted_at else None,
        'next_incomplete_step': app.next_incomplete_step(),
        'is_ready_to_submit': app.is_ready_to_submit(),
    }


class BusinessApplicationView(APIView):
    """GET / PATCH the current business's application.

    GET  /api/beauty/protected/business/application/  — fetch (auto-create on first hit).
    PATCH /api/beauty/protected/business/application/ — partial update for one step.

    PATCH body shape:
        {
            "step": "entity" | "services" | "stripe" | "schedule" | "tools",
            "entity_type": "person|business",
            "itin": "...",
            ...
        }
    The step key (when present) gets appended to ``completed_steps``.
    """

    def get(self, request):
        business, _store, err = _require_business_storefront(request)
        if err:
            return err
        app = _get_or_create_application(business)
        return Response({'application': _application_to_dict(app)}, status=status.HTTP_200_OK)

    def patch(self, request):
        business, _store, err = _require_business_storefront(request)
        if err:
            return err
        app = _get_or_create_application(business)
        if app.status == BusinessProviderApplication.STATUS_ACCEPTED:
            return Response(
                {'detail': 'Application already accepted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = request.data or {}
        step = (data.get('step') or '').strip().lower()

        if step == 'entity':
            entity_type = (data.get('entity_type') or '').strip().lower()
            if entity_type not in {BusinessProviderApplication.ENTITY_PERSON,
                                   BusinessProviderApplication.ENTITY_BUSINESS}:
                return Response(
                    {'detail': 'Choose person or business.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            itin = (data.get('itin') or '').strip()
            if entity_type == BusinessProviderApplication.ENTITY_BUSINESS:
                digits = ''.join(ch for ch in itin if ch.isdigit())
                if len(digits) != 9:
                    return Response(
                        {'detail': 'ITIN must be 9 digits.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                itin = digits
            else:
                itin = ''
            first = (data.get('applicant_first_name') or '').strip()
            last = (data.get('applicant_last_name') or '').strip()
            if not first or not last:
                return Response(
                    {'detail': 'Applicant first and last name are required.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            biz_name = (data.get('business_name') or '').strip()
            if not biz_name:
                return Response(
                    {'detail': 'Business name is required.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            app.entity_type = entity_type
            app.itin = itin
            app.applicant_first_name = first[:128]
            app.applicant_last_name = last[:128]
            app.business_name = biz_name[:255]
            app.address_line1 = (data.get('address_line1') or '').strip()[:255]
            app.address_line2 = (data.get('address_line2') or '').strip()[:255]
            app.city = (data.get('city') or '').strip()[:128]
            app.state = (data.get('state') or '').strip()[:64]
            app.postal_code = (data.get('postal_code') or '').strip()[:32]
            app.mark_step_complete('entity')

        elif step == 'services':
            cats = data.get('selected_categories') or []
            if not isinstance(cats, list):
                return Response({'detail': 'selected_categories must be a list.'},
                                status=status.HTTP_400_BAD_REQUEST)
            cleaned = [c for c in cats if isinstance(c, str) and c in VALID_CATEGORIES]
            if not cleaned:
                return Response(
                    {'detail': 'Pick at least one service category.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            app.selected_categories = list(dict.fromkeys(cleaned))
            app.mark_step_complete('services')

        elif step == 'stripe':
            # Stand-in only — flips a completion flag.
            app.mark_step_complete('stripe')

        elif step == 'schedule':
            # The actual hours are saved through the existing
            # BusinessAvailabilityView. This call just records that the
            # user reviewed/saved their hours.
            app.mark_step_complete('schedule')

        elif step == 'tools':
            tools = data.get('third_party_tools') or []
            if not isinstance(tools, list):
                return Response({'detail': 'third_party_tools must be a list.'},
                                status=status.HTTP_400_BAD_REQUEST)
            cleaned = [t for t in tools if isinstance(t, str) and t in VALID_TOOLS]
            app.third_party_tools = list(dict.fromkeys(cleaned))
            app.mark_step_complete('tools')

        else:
            return Response(
                {'detail': f'Unknown step: {step or "(missing)"}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        app.save()
        return Response({'application': _application_to_dict(app)}, status=status.HTTP_200_OK)


class BusinessApplicationSubmitView(APIView):
    """POST /api/beauty/protected/business/application/submit/

    Validates the application is ready (all steps complete + ToS accepted)
    and flips status to ``accepted`` (auto-approval this round). On success
    the response carries a ``redirect`` link the BFF emits onward to the
    business home.
    """

    def post(self, request):
        business, _store, err = _require_business_storefront(request)
        if err:
            return err
        app = _get_or_create_application(business)
        if app.status == BusinessProviderApplication.STATUS_ACCEPTED:
            return Response(
                {'detail': 'Application already accepted.', 'application': _application_to_dict(app)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        accept_tos = bool((request.data or {}).get('accept_tos'))
        if accept_tos and not app.tos_accepted_at:
            app.tos_accepted_at = datetime.now(timezone.utc)
        if not app.is_ready_to_submit():
            return Response(
                {
                    'detail': 'Application is not ready to submit.',
                    'application': _application_to_dict(app),
                    'next_incomplete_step': app.next_incomplete_step(),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = datetime.now(timezone.utc)
        app.submitted_at = now
        app.accepted_at = now
        app.status = BusinessProviderApplication.STATUS_ACCEPTED
        app.save()
        # Sync the auth-account business_name to whatever the applicant
        # submitted so the storefront title and dashboard greeting match.
        if business.business_name != app.business_name and app.business_name:
            business.business_name = app.business_name[:255]
            business.save(update_fields=['business_name'])
        # Reflect onto the public storefront too.
        store = ensure_storefront(business)
        if store.name != app.business_name and app.business_name:
            store.name = app.business_name[:255]
            store.save(update_fields=['name'])
        return Response(
            {
                'application': _application_to_dict(app),
                'next_screen': 'beauty_business_home',
            },
            status=status.HTTP_200_OK,
        )


class BusinessCalendarStatsView(APIView):
    """GET /api/beauty/protected/business/calendar/

    Month-bucketed calendar + earnings/booking gauges.

    Query: ?year=YYYY&month=MM (defaults to current month UTC).

    Response::
        {
          "month":          "2026-05",
          "today":          "2026-05-02",
          "month_bookings": { "YYYY-MM-DD": [ {id, customer_email, service_name, slot_at, status, price_cents, duration_minutes} ] },
          "stats": {
            "earnings_cents":    int,
            "earnings_target_cents": int,
            "bookings_count":    int,
            "by_category":       { "facial": 3, ... },
            "new_clients":       int,
            "recurring_clients": int
          }
        }
    """

    def get(self, request):
        _, storefront, err = _require_business_storefront(request)
        if err:
            return err
        try:
            year = int(request.GET.get('year')) if request.GET.get('year') else None
            month = int(request.GET.get('month')) if request.GET.get('month') else None
            payload = compute_month_payload(storefront, year=year, month=month)
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid year/month.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(payload, status=status.HTTP_200_OK)


class BusinessBookingsView(APIView):
    """GET /api/beauty/protected/business/bookings/ — all bookings on this storefront."""

    def get(self, request):
        _, storefront, err = _require_business_storefront(request)
        if err:
            return err
        bookings = (
            BeautyBooking.objects.select_related('service', 'customer')
            .filter(service__provider=storefront)
            .order_by('-slot_at')
        )
        now = datetime.now(timezone.utc)
        items = []
        for b in bookings:
            # Hide grace-period cancellations from the business list — they're
            # treated as never-happened.
            if b.status == BeautyBooking.STATUS_CANCELLED_IMMEDIATE:
                continue
            items.append({
                'id': b.id,
                'status': b.status,
                'slot_at': b.slot_at.isoformat(),
                'is_upcoming': b.status == BeautyBooking.STATUS_BOOKED and b.slot_at > now,
                'service': {
                    'id': b.service.id,
                    'name': b.display_service_name,
                    'description': b.service.description,
                    'category': b.service.category,
                    'price_cents': b.display_price_cents,
                    'duration_minutes': b.display_duration_minutes,
                },
                'customer_email': b.customer.email,
            })
        return Response({'bookings': items}, status=status.HTTP_200_OK)
