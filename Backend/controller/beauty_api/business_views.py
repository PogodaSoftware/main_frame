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

import hashlib
import re
from datetime import datetime, timezone

from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .availability_service import (
    ensure_storefront,
    get_weekly_hours,
    replace_weekly_hours,
)
from .calendar_stats_service import compute_month_payload
from .middleware import SESSION_COOKIE_NAME
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
    from decimal import Decimal
    dollars = svc.price_dollars
    if dollars is None:
        dollars = (Decimal(svc.price_cents) / Decimal(100)).quantize(Decimal('0.01'))
    return {
        'id': svc.id,
        'name': svc.name,
        'description': svc.description,
        'category': svc.category,
        'price_cents': svc.price_cents,
        'price_dollars': f"{dollars:.2f}",
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


_PRICE_DOLLARS_RX = re.compile(r'^\d+(\.\d{1,2})?$')


def _clean_service_payload(data) -> tuple[dict, str | None]:
    from decimal import Decimal, InvalidOperation
    name = (data.get('name') or '').strip()
    if not name:
        return {}, 'Name is required.'
    category = (data.get('category') or '').strip().lower()
    if category not in VALID_CATEGORIES:
        return {}, 'Choose a valid category.'
    description = (data.get('description') or '').strip()
    # Prefer dollars from new UI; fall back to cents from legacy callers.
    raw_dollars = data.get('price_dollars')
    if raw_dollars is not None and str(raw_dollars).strip() != '':
        s = str(raw_dollars).strip()
        if not _PRICE_DOLLARS_RX.match(s):
            return {}, 'Price must be in dollars with up to 2 decimals (e.g. 49.99).'
        try:
            dollars = Decimal(s).quantize(Decimal('0.01'))
        except InvalidOperation:
            return {}, 'Price must be in dollars with up to 2 decimals (e.g. 49.99).'
        if dollars < 0 or dollars > Decimal('9999.99'):
            return {}, 'Price must be between $0.00 and $9999.99.'
        price_cents = int((dollars * 100).to_integral_value())
    else:
        try:
            price_cents = int(data.get('price_cents') or 0)
        except (TypeError, ValueError):
            return {}, 'Price must be a whole number of cents.'
        if price_cents < 0:
            return {}, 'Price must be zero or positive.'
        dollars = (Decimal(price_cents) / Decimal(100)).quantize(Decimal('0.01'))
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
        'price_dollars': dollars,
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


class BusinessEarningsView(APIView):
    """GET /api/beauty/protected/business/earnings/

    Returns lifetime + monthly + YTD earnings the storefront has collected
    from customers. Earnings = sum of `display_price_cents` over all bookings
    with `status in (booked, completed)` (i.e. money customers paid out).
    """

    def get(self, request):
        _, storefront, err = _require_business_storefront(request)
        if err:
            return err
        qs = BeautyBooking.objects.filter(
            service__provider=storefront,
            status__in=(BeautyBooking.STATUS_BOOKED, BeautyBooking.STATUS_COMPLETED),
        )
        now = datetime.now(timezone.utc)
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        year_start = datetime(now.year, 1, 1, tzinfo=timezone.utc)

        def _sum(rows) -> int:
            total = 0
            for b in rows:
                total += b.display_price_cents or 0
            return total

        all_rows = list(qs)
        total_cents = _sum(all_rows)
        month_cents = _sum(b for b in all_rows if b.slot_at >= month_start)
        year_cents = _sum(b for b in all_rows if b.slot_at >= year_start)
        total_paid_bookings = len(all_rows)

        return Response(
            {
                'currency': 'USD',
                'total_cents': total_cents,
                'this_month_cents': month_cents,
                'this_year_cents': year_cents,
                'paid_bookings_count': total_paid_bookings,
            },
            status=status.HTTP_200_OK,
        )


class BusinessAccountPasswordView(APIView):
    """POST /api/beauty/protected/business/account/password/

    Body: { "current_password": str, "new_password": str }
    Verifies the current password, sets a new one, and invalidates all
    sessions for the account so other devices are signed out.
    """

    def post(self, request):
        business, _store, err = _require_business_storefront(request)
        if err:
            return err
        data = request.data or {}
        current = (data.get('current_password') or '').strip()
        new_password = (data.get('new_password') or '').strip()

        if not current or not new_password:
            return Response(
                {'detail': 'Both current and new password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 8:
            return Response(
                {'detail': 'New password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not check_password(current, business.password):
            return Response(
                {'detail': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        business.set_password(new_password)
        business.save(update_fields=['password'])
        # Invalidate all other sessions for this account except the current
        # device — the user shouldn't be silently logged out where they are.
        raw_cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
        keep_token_hash = (
            hashlib.sha256(raw_cookie.encode()).hexdigest() if raw_cookie else None
        )
        sessions = BeautySession.objects.filter(
            user_id=business.id,
            user_type=BeautySession.USER_TYPE_BUSINESS,
        )
        if keep_token_hash:
            sessions = sessions.exclude(token_hash=keep_token_hash)
        sessions.update(is_active=False)

        return Response({'message': 'Password updated.'}, status=status.HTTP_200_OK)


_PHONE_RX = re.compile(r'^[\d+()\-\s]{6,32}$')


class BusinessAccountContactView(APIView):
    """GET / PATCH /api/beauty/protected/business/account/contact/

    Body fields (all optional on PATCH):
        email                — sign-in email (unique)
        public_email         — storefront-facing email; '' to hide
        contact_phone        — '+1 415 555 0142' style; ''
        show_phone_publicly  — bool
    """

    def get(self, request):
        business, _store, err = _require_business_storefront(request)
        if err:
            return err
        return Response(self._payload(business), status=status.HTTP_200_OK)

    def patch(self, request):
        business, _store, err = _require_business_storefront(request)
        if err:
            return err
        data = request.data or {}

        if 'email' in data:
            new_email = (data.get('email') or '').strip().lower()
            if not new_email or '@' not in new_email:
                return Response({'detail': 'A valid sign-in email is required.'}, status=status.HTTP_400_BAD_REQUEST)
            clash = BusinessProvider.objects.exclude(id=business.id).filter(email__iexact=new_email).exists()
            if clash:
                return Response({'detail': 'That email is already in use.'}, status=status.HTTP_400_BAD_REQUEST)
            business.email = new_email

        if 'public_email' in data:
            pe = (data.get('public_email') or '').strip().lower()
            if pe and '@' not in pe:
                return Response({'detail': 'Public email must be a valid address (or blank).'}, status=status.HTTP_400_BAD_REQUEST)
            business.public_email = pe

        if 'contact_phone' in data:
            phone = (data.get('contact_phone') or '').strip()
            if phone and not _PHONE_RX.match(phone):
                return Response({'detail': 'Phone must be 6–32 chars; digits, spaces, +, (, ), -.'}, status=status.HTTP_400_BAD_REQUEST)
            business.contact_phone = phone

        if 'show_phone_publicly' in data:
            business.show_phone_publicly = bool(data.get('show_phone_publicly'))

        business.save(update_fields=['email', 'public_email', 'contact_phone', 'show_phone_publicly'])
        return Response(self._payload(business), status=status.HTTP_200_OK)

    @staticmethod
    def _payload(business: BusinessProvider) -> dict:
        return {
            'email': business.email,
            'public_email': business.public_email or '',
            'contact_phone': business.contact_phone or '',
            'show_phone_publicly': bool(business.show_phone_publicly),
        }


class BusinessAccountDeleteView(APIView):
    """POST /api/beauty/protected/business/account/delete/

    Permanently removes the business provider account. All future
    `booked` bookings are flagged ``cancelled_by_business`` so customers
    are notified, then the auth row is deleted (storefront + services
    cascade via FK). The session cookie is cleared so the client is
    signed out on the response.
    """

    def post(self, request):
        business, storefront, err = _require_business_storefront(request)
        if err:
            return err

        # Cancel future bookings so customers get a refund pathway.
        now = datetime.now(timezone.utc)
        BeautyBooking.objects.filter(
            service__provider=storefront,
            status=BeautyBooking.STATUS_BOOKED,
            slot_at__gt=now,
        ).update(status=BeautyBooking.STATUS_CANCELLED_BY_BUSINESS)

        # Invalidate every session bound to this business.
        BeautySession.objects.filter(
            user_id=business.id,
            user_type=BeautySession.USER_TYPE_BUSINESS,
        ).update(is_active=False)

        # Drop the public storefront — keeps catalog clean. Services
        # cascade via FK; past bookings keep snapshot fields (PROTECT
        # would otherwise block service deletion if any booking exists,
        # so we null the FK back-link instead and leave the storefront
        # row in place when bookings reference it).
        try:
            storefront.delete()
        except Exception:
            # Some service has historical bookings via PROTECT —
            # rename the storefront so it stops appearing publicly.
            storefront.name = f'[deleted-{storefront.id}]'
            storefront.business_provider_id = None
            storefront.save(update_fields=['name', 'business_provider_id'])

        business.delete()

        response = Response({'message': 'Account deleted.'}, status=status.HTTP_200_OK)
        response.delete_cookie(SESSION_COOKIE_NAME, path='/')
        return response
