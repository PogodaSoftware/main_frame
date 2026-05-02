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
