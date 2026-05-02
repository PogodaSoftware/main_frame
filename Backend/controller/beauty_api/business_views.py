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

from datetime import datetime, timedelta, timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .availability_service import (
    ensure_storefront,
    get_weekly_hours,
    replace_weekly_hours,
)
from .models import (
    BeautyBooking,
    BeautyProvider,
    BeautyService,
    BeautySession,
    BusinessApplication,
    BusinessProvider,
)


VALID_CATEGORIES = {c[0] for c in BeautyService.CATEGORY_CHOICES}

# Whitelist of integration tool slugs the application step 5 may store.
VALID_THIRD_PARTY_TOOLS = {
    'google_calendar', 'apple_calendar', 'mailchimp', 'square_pos',
    'instagram', 'tiktok', 'yelp',
}


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


# ---------------------------------------------------------------------------
# Business Application (5-step onboarding) views
# ---------------------------------------------------------------------------


def _application_to_dict(app: BusinessApplication) -> dict:
    return {
        'status': app.status,
        'current_step': app.current_step,
        'applicant_kind': app.applicant_kind,
        'first_name': app.business.first_name,
        'last_name': app.business.last_name,
        'business_name': app.business.business_name,
        'itin': app.itin,
        'legal_business_name': app.legal_business_name,
        'address_line1': app.address_line1,
        'address_line2': app.address_line2,
        'address_city': app.address_city,
        'address_state': app.address_state,
        'address_postal_code': app.address_postal_code,
        'services_offered': list(app.services_offered or []),
        'stripe_connected': app.stripe_connected,
        'stripe_placeholder_account': app.stripe_placeholder_account,
        'schedule_template': list(app.schedule_template or []),
        'third_party_tools': list(app.third_party_tools or []),
        'tos_accepted': app.tos_accepted,
        'submitted_at': app.submitted_at.isoformat() if app.submitted_at else None,
    }


def _save_step_1(app: BusinessApplication, data: dict) -> tuple[bool, str | None]:
    """Identity: applicant kind, name, ITIN, legal/business name, address."""
    business = app.business
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    if not first_name:
        return False, 'First name is required.'
    if not last_name:
        return False, 'Last name is required.'
    business_name = (data.get('business_name') or '').strip()
    if not business_name:
        return False, 'Business name is required.'
    address_line1 = (data.get('address_line1') or '').strip()
    if not address_line1:
        return False, 'Street address is required.'
    address_city = (data.get('address_city') or '').strip()
    if not address_city:
        return False, 'City is required.'
    address_state = (data.get('address_state') or '').strip()
    if not address_state:
        return False, 'State is required.'
    address_postal = (data.get('address_postal_code') or '').strip()
    if not address_postal:
        return False, 'ZIP code is required.'
    itin = (data.get('itin') or '').strip()
    if not itin:
        return False, 'ITIN / SSN is required.'
    # Strip whitespace and dashes for storage; basic length check.
    itin_compact = ''.join(c for c in itin if c.isdigit())
    if len(itin_compact) != 9:
        return False, 'ITIN / SSN must be 9 digits.'
    applicant_kind = (data.get('applicant_kind') or '').strip().lower()
    if applicant_kind not in {BusinessApplication.APPLICANT_PERSON, BusinessApplication.APPLICANT_BUSINESS}:
        applicant_kind = BusinessApplication.APPLICANT_PERSON

    business.first_name = first_name[:120]
    business.last_name = last_name[:120]
    business.business_name = business_name[:255]
    business.save(update_fields=['first_name', 'last_name', 'business_name'])

    # Mirror business_name to the public storefront so the portal stays in sync.
    storefront = ensure_storefront(business)
    if storefront.name != business_name:
        storefront.name = business_name[:255]
        storefront.save(update_fields=['name'])

    app.applicant_kind = applicant_kind
    app.itin = itin_compact
    app.legal_business_name = (data.get('legal_business_name') or business_name)[:255]
    app.address_line1 = address_line1[:255]
    app.address_line2 = (data.get('address_line2') or '').strip()[:255]
    app.address_city = address_city[:120]
    app.address_state = address_state[:64]
    app.address_postal_code = address_postal[:32]
    return True, None


def _save_step_2(app: BusinessApplication, data: dict) -> tuple[bool, str | None]:
    """Services: subset of category slugs."""
    raw = data.get('services_offered') or []
    if not isinstance(raw, list):
        return False, 'services_offered must be a list of category slugs.'
    cleaned: list[str] = []
    for slug in raw:
        s = str(slug or '').strip().lower()
        if s in VALID_CATEGORIES and s not in cleaned:
            cleaned.append(s)
    if not cleaned:
        return False, 'Choose at least one service category.'
    app.services_offered = cleaned
    return True, None


def _save_step_3(app: BusinessApplication, data: dict) -> tuple[bool, str | None]:
    """Stripe placeholder — accept a fake-connected flag for now."""
    app.stripe_connected = bool(data.get('stripe_connected'))
    placeholder = (data.get('stripe_placeholder_account') or '').strip()[:64]
    if app.stripe_connected and not placeholder:
        # Generate a placeholder id so the dashboard has something to show.
        placeholder = f'acct_pending_{app.business.id}'
    app.stripe_placeholder_account = placeholder
    if not app.stripe_connected:
        return False, 'Connect Stripe (placeholder) to continue.'
    return True, None


def _save_step_4(app: BusinessApplication, data: dict) -> tuple[bool, str | None]:
    """Schedule template: list of 7 weekly rows, same shape as availability."""
    raw = data.get('schedule_template') or []
    if not isinstance(raw, list):
        return False, 'schedule_template must be a list of 7 daily rows.'
    cleaned = []
    seen = set()
    for row in raw:
        if not isinstance(row, dict):
            continue
        try:
            dow = int(row.get('day_of_week'))
        except (TypeError, ValueError):
            continue
        if dow < 0 or dow > 6 or dow in seen:
            continue
        seen.add(dow)
        cleaned.append({
            'day_of_week': dow,
            'is_closed': bool(row.get('is_closed')),
            'is_24h': bool(row.get('is_24h')),
            'start_time': str(row.get('start_time') or '10:00')[:5],
            'end_time': str(row.get('end_time') or '18:00')[:5],
        })
    if len(cleaned) < 1:
        return False, 'Set hours for at least one day of the week.'
    # Validate end > start for non-closed/non-24h rows.
    for row in cleaned:
        if row['is_closed'] or row['is_24h']:
            continue
        if row['end_time'] <= row['start_time']:
            return False, 'End time must be after start time on every open day.'
    app.schedule_template = cleaned
    return True, None


def _save_step_5(app: BusinessApplication, data: dict) -> tuple[bool, str | None]:
    """Third-party tools + ToS acceptance."""
    raw = data.get('third_party_tools') or []
    if not isinstance(raw, list):
        return False, 'third_party_tools must be a list.'
    cleaned: list[str] = []
    for slug in raw:
        s = str(slug or '').strip().lower()
        if s in VALID_THIRD_PARTY_TOOLS and s not in cleaned:
            cleaned.append(s)
    app.third_party_tools = cleaned
    if not bool(data.get('tos_accepted')):
        return False, 'You must accept the Terms of Service to continue.'
    app.tos_accepted = True
    app.tos_accepted_at = datetime.now(timezone.utc)
    return True, None


_STEP_HANDLERS = {
    1: _save_step_1,
    2: _save_step_2,
    3: _save_step_3,
    4: _save_step_4,
    5: _save_step_5,
}


def _finalize_application(app: BusinessApplication) -> None:
    """Apply submitted application to live storefront + flip completed flag."""
    business = app.business
    storefront = ensure_storefront(business)
    # Apply schedule template if present.
    if app.schedule_template:
        replace_weekly_hours(storefront, app.schedule_template)
    # Seed a placeholder service per chosen category so the dashboard isn't
    # empty (the business owner can edit/remove these later).
    existing_categories = set(
        BeautyService.objects.filter(provider=storefront).values_list('category', flat=True)
    )
    for slug in (app.services_offered or []):
        if slug in existing_categories:
            continue
        BeautyService.objects.create(
            provider=storefront,
            name=f"{slug.title()} consultation",
            description='Initial consultation. Edit this service to suit your menu.',
            category=slug,
            price_cents=0,
            duration_minutes=60,
        )
    app.status = BusinessApplication.STATUS_SUBMITTED
    app.submitted_at = datetime.now(timezone.utc)
    app.current_step = 5
    app.save()
    business.application_completed = True
    business.save(update_fields=['application_completed'])


class BusinessApplicationView(APIView):
    """
    GET  /api/beauty/protected/business/application/         — read draft.
    POST /api/beauty/protected/business/application/         — save one step
        body: { "step": 1..5, ...step-specific fields }
    POST /api/beauty/protected/business/application/submit/  — final submit.
    """

    def _load(self, request):
        business, storefront, err = _require_business_storefront(request)
        if err:
            return None, None, err
        app, _ = BusinessApplication.objects.get_or_create(business=business)
        return business, app, None

    def get(self, request):
        _, app, err = self._load(request)
        if err:
            return err
        return Response(_application_to_dict(app), status=status.HTTP_200_OK)

    def post(self, request):
        _, app, err = self._load(request)
        if err:
            return err
        try:
            step = int(request.data.get('step') or 0)
        except (TypeError, ValueError):
            step = 0
        handler = _STEP_HANDLERS.get(step)
        if handler is None:
            return Response(
                {'detail': 'step must be an integer 1..5.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ok, error = handler(app, request.data)
        if not ok:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)
        # Advance the cursor only when moving forward.
        app.current_step = max(app.current_step, min(step + 1, 5))
        app.save()
        return Response(_application_to_dict(app), status=status.HTTP_200_OK)


class BusinessApplicationSubmitView(APIView):
    """POST /api/beauty/protected/business/application/submit/"""

    def post(self, request):
        business, storefront, err = _require_business_storefront(request)
        if err:
            return err
        try:
            app = BusinessApplication.objects.get(business=business)
        except BusinessApplication.DoesNotExist:
            return Response(
                {'detail': 'Start the application before submitting.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # All five steps must be valid before the application can complete.
        if not app.business.first_name or not app.itin or not app.address_line1:
            return Response({'detail': 'Finish step 1 (identity) before submitting.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not app.services_offered:
            return Response({'detail': 'Finish step 2 (services) before submitting.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not app.stripe_connected:
            return Response({'detail': 'Finish step 3 (Stripe) before submitting.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not app.schedule_template:
            return Response({'detail': 'Finish step 4 (schedule) before submitting.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not app.tos_accepted:
            return Response({'detail': 'You must accept the Terms of Service.'},
                            status=status.HTTP_400_BAD_REQUEST)
        _finalize_application(app)
        return Response(_application_to_dict(app), status=status.HTTP_200_OK)


class BusinessDashboardOverviewView(APIView):
    """
    GET /api/beauty/protected/business/dashboard/overview/

    Returns the giant-calendar payload + earnings/clients gauges that the
    onboarded-business landing page renders.
    """

    def get(self, request):
        _, storefront, err = _require_business_storefront(request)
        if err:
            return err

        now = datetime.now(timezone.utc)
        # 30-day window: yesterday → 29 days ahead, so the calendar shows
        # both upcoming bookings and the most recent completed ones.
        window_start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        window_end = (now + timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)

        bookings = list(
            BeautyBooking.objects.select_related('service', 'customer')
            .filter(
                service__provider=storefront,
                slot_at__gte=window_start,
                slot_at__lt=window_end,
            )
            .exclude(status=BeautyBooking.STATUS_CANCELLED_IMMEDIATE)
            .order_by('slot_at')
        )

        calendar_events = [
            {
                'id': b.id,
                'slot_at': b.slot_at.isoformat(),
                'duration_minutes': b.display_duration_minutes,
                'status': b.status,
                'service_name': b.display_service_name,
                'customer_email': b.customer.email,
                'price_cents': b.display_price_cents,
            }
            for b in bookings
        ]

        # Earnings = sum of price_cents for booked or completed bookings in
        # the current calendar month, irrespective of slot_at vs now (we
        # treat any non-cancelled booking as expected revenue for the demo).
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (month_start + timedelta(days=32)).replace(day=1)
        earnings_cents = 0
        for b in BeautyBooking.objects.filter(
            service__provider=storefront,
            slot_at__gte=month_start,
            slot_at__lt=next_month,
        ).exclude(status=BeautyBooking.STATUS_CANCELLED_IMMEDIATE):
            earnings_cents += b.display_price_cents

        # Earnings target $5,000/month for the gauge ring; clients target 50.
        earnings_target_cents = 500_000
        unique_clients = (
            BeautyBooking.objects.filter(service__provider=storefront)
            .exclude(status=BeautyBooking.STATUS_CANCELLED_IMMEDIATE)
            .values('customer_id')
            .distinct()
            .count()
        )
        clients_target = 50
        upcoming_count = sum(
            1 for b in bookings
            if b.status == BeautyBooking.STATUS_BOOKED and b.slot_at > now
        )

        return Response({
            'storefront': {
                'id': storefront.id,
                'name': storefront.name,
            },
            'calendar': {
                'window_start': window_start.isoformat(),
                'window_end': window_end.isoformat(),
                'events': calendar_events,
            },
            'gauges': {
                'earnings': {
                    'label': 'Monthly earnings',
                    'value_cents': earnings_cents,
                    'target_cents': earnings_target_cents,
                    'percent': min(
                        100, int(round(earnings_cents * 100 / max(earnings_target_cents, 1))),
                    ),
                    'caption': f'${earnings_cents/100:,.0f} of ${earnings_target_cents/100:,.0f}',
                },
                'clients': {
                    'label': 'Bookings & clients',
                    'value': unique_clients,
                    'target': clients_target,
                    'percent': min(
                        100, int(round(unique_clients * 100 / max(clients_target, 1))),
                    ),
                    'caption': f'{unique_clients} clients · {upcoming_count} upcoming',
                },
            },
        }, status=status.HTTP_200_OK)
