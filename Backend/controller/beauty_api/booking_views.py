"""
Beauty Booking API Views
========================
Customer-facing read endpoints (categories, providers, services) and
protected write endpoints (bookings) for the Beauty marketplace.

The mutating endpoints live under `/api/beauty/protected/bookings/` so
the existing BeautyAuthMiddleware enforces a valid customer session.

Public read endpoints (`categories`, `providers/<id>`, `services/<id>`)
require a valid customer session as well — see the auth gate at the
top of each handler. The only public POST endpoints in `beauty_api`
are signup and login.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .availability_service import is_slot_available
from .models import (
    BeautyBooking,
    BeautyProvider,
    BeautyService,
    BeautySession,
    BeautyUser,
)


def _grace_period_minutes() -> int:
    return getattr(settings, 'BEAUTY_GRACE_PERIOD_MINUTES', 5)


def _service_to_dict(svc: BeautyService) -> dict:
    return {
        'id': svc.id,
        'name': svc.name,
        'description': svc.description,
        'price_cents': svc.price_cents,
        'duration_minutes': svc.duration_minutes,
        'category': svc.category,
    }


def _booking_service_view(b: BeautyBooking) -> dict:
    """Render service info for a booking using snapshot fields when present."""
    svc = b.service
    return {
        'id': svc.id,
        'name': b.display_service_name,
        'description': svc.description,
        'price_cents': b.display_price_cents,
        'duration_minutes': b.display_duration_minutes,
        'category': svc.category,
    }


def _require_authenticated(request):
    """Block anonymous callers on previously-public read endpoints.

    These views live OUTSIDE `/api/beauty/protected/` so the auth
    middleware doesn't pre-populate `request.beauty_user_id`. We
    re-validate the signed cookie here so anonymous calls return
    401 instead of leaking the catalog.
    """
    # If middleware already set these (i.e. for protected paths), trust it.
    user_id = getattr(request, 'beauty_user_id', None)
    user_type = getattr(request, 'beauty_user_type', None)
    if user_id and user_type:
        return None

    # Re-validate signed cookie inline.
    import hashlib
    from django.core import signing
    from .middleware import (
        SESSION_COOKIE_NAME,
        SESSION_MAX_AGE_SECONDS,
        DEVICE_ID_HEADER,
    )

    raw_cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    device_id = (request.META.get(DEVICE_ID_HEADER, '') or '').strip()
    if not raw_cookie or not device_id:
        return Response(
            {'detail': 'Authentication required.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    try:
        payload = signing.loads(raw_cookie, max_age=SESSION_MAX_AGE_SECONDS)
    except Exception:
        return Response(
            {'detail': 'Authentication required.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    if payload.get('device_id') != device_id:
        return Response(
            {'detail': 'Authentication required.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    token_hash = hashlib.sha256(raw_cookie.encode()).hexdigest()
    session_valid = BeautySession.objects.filter(
        token_hash=token_hash,
        user_id=payload['user_id'],
        user_type=payload['user_type'],
        device_id=payload['device_id'],
        is_active=True,
        expires_at__gt=datetime.now(timezone.utc),
    ).exists()
    if not session_valid:
        return Response(
            {'detail': 'Authentication required.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    request.beauty_user_id = payload['user_id']
    request.beauty_user_type = payload['user_type']
    request.beauty_device_id = payload['device_id']
    return None


def _provider_to_dict(p: BeautyProvider) -> dict:
    return {
        'id': p.id,
        'name': p.name,
        'short_description': p.short_description,
        'location_label': p.location_label,
    }


VALID_CATEGORIES = {c[0] for c in BeautyService.CATEGORY_CHOICES}


class CategoryListView(APIView):
    """GET /api/beauty/categories/<slug>/ — providers offering this category.

    Requires a valid customer/business session (no anonymous access).
    """

    def get(self, request, category):
        err = _require_authenticated(request)
        if err:
            return err
        cat = (category or '').lower()
        if cat not in VALID_CATEGORIES:
            return Response({'detail': 'Unknown category.'}, status=status.HTTP_404_NOT_FOUND)

        services = (
            BeautyService.objects.select_related('provider')
            .filter(category=cat)
            .order_by('provider__name', 'name')
        )

        # Group services under their providers, preserving order.
        providers: dict[int, dict] = {}
        for svc in services:
            p = svc.provider
            entry = providers.setdefault(
                p.id,
                {**_provider_to_dict(p), 'services': []},
            )
            entry['services'].append(_service_to_dict(svc))

        return Response(
            {'category': cat, 'providers': list(providers.values())},
            status=status.HTTP_200_OK,
        )


class ProviderDetailView(APIView):
    """GET /api/beauty/providers/<id>/ — provider profile + all services.

    Requires a valid session.
    """

    def get(self, request, provider_id):
        err = _require_authenticated(request)
        if err:
            return err
        try:
            provider = BeautyProvider.objects.get(id=provider_id)
        except BeautyProvider.DoesNotExist:
            return Response({'detail': 'Provider not found.'}, status=status.HTTP_404_NOT_FOUND)

        services = list(provider.services.all().order_by('category', 'name'))
        return Response(
            {
                'id': provider.id,
                'name': provider.name,
                'short_description': provider.short_description,
                'long_description': provider.long_description,
                'location_label': provider.location_label,
                'services': [_service_to_dict(s) for s in services],
            },
            status=status.HTTP_200_OK,
        )


class ServiceDetailView(APIView):
    """GET /api/beauty/services/<id>/ — single-service info for booking screens.

    Requires a valid session.
    """

    def get(self, request, service_id):
        err = _require_authenticated(request)
        if err:
            return err
        try:
            svc = BeautyService.objects.select_related('provider').get(id=service_id)
        except BeautyService.DoesNotExist:
            return Response({'detail': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(
            {
                **_service_to_dict(svc),
                'provider': _provider_to_dict(svc.provider),
            },
            status=status.HTTP_200_OK,
        )


def _require_customer(request) -> int | None:
    user_id = getattr(request, 'beauty_user_id', None)
    user_type = getattr(request, 'beauty_user_type', None)
    if user_type != BeautySession.USER_TYPE_CUSTOMER or not user_id:
        return None
    return user_id


class MyBookingsView(APIView):
    """
    GET  /api/beauty/protected/bookings/         → list current customer's bookings.
    POST /api/beauty/protected/bookings/         → create a booking { service_id, slot_at }.
    """

    def get(self, request):
        customer_id = _require_customer(request)
        if customer_id is None:
            return Response({'detail': 'Customers only.'}, status=status.HTTP_403_FORBIDDEN)

        bookings = (
            BeautyBooking.objects.select_related('service', 'service__provider')
            .filter(customer_id=customer_id)
        )
        now = datetime.now(timezone.utc)
        upcoming = []
        past = []
        for b in bookings:
            # Bookings cancelled within the grace period are hidden from
            # the past list (treated as never-happened).
            if b.status == BeautyBooking.STATUS_CANCELLED_IMMEDIATE:
                continue
            item = {
                'id': b.id,
                'status': b.status,
                'slot_at': b.slot_at.isoformat(),
                'is_upcoming': b.status == BeautyBooking.STATUS_BOOKED and b.slot_at > now,
                'service': _booking_service_view(b),
                'provider': _provider_to_dict(b.service.provider),
            }
            if b.status == BeautyBooking.STATUS_BOOKED and b.slot_at > now:
                upcoming.append(item)
            else:
                past.append(item)
        # Upcoming: soonest first. Past: most-recent first.
        upcoming.sort(key=lambda x: x['slot_at'])
        past.sort(key=lambda x: x['slot_at'], reverse=True)
        return Response(
            {
                'upcoming': upcoming,
                'past': past,
                # Legacy flat list kept so older clients/tests still pass.
                'bookings': upcoming + past,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        customer_id = _require_customer(request)
        if customer_id is None:
            return Response({'detail': 'Customers only.'}, status=status.HTTP_403_FORBIDDEN)

        service_id = request.data.get('service_id')
        slot_at_raw = (request.data.get('slot_at') or '').strip()

        if not service_id or not slot_at_raw:
            return Response(
                {'detail': 'service_id and slot_at are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            service = BeautyService.objects.get(id=service_id)
        except (BeautyService.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            # Accept both "...Z" and "+00:00" suffixes.
            normalized = slot_at_raw.replace('Z', '+00:00')
            slot_at = datetime.fromisoformat(normalized)
            if slot_at.tzinfo is None:
                slot_at = slot_at.replace(tzinfo=timezone.utc)
        except ValueError:
            return Response(
                {'detail': 'slot_at must be ISO-8601.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ok, err = is_slot_available(service, slot_at)
        if not ok:
            return Response(
                {'detail': err or 'Slot is not available.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            customer = BeautyUser.objects.get(id=customer_id)
        except BeautyUser.DoesNotExist:
            return Response({'detail': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)

        now = datetime.now(timezone.utc)
        grace_minutes = _grace_period_minutes()
        booking = BeautyBooking.objects.create(
            customer=customer,
            service=service,
            slot_at=slot_at,
            # Snapshot service fields so past bookings keep their original
            # price/duration/name even if the business edits the service.
            service_name_at_booking=service.name,
            service_price_cents_at_booking=service.price_cents,
            service_price_dollars_at_booking=(
                service.price_dollars
                if service.price_dollars is not None
                else (Decimal(service.price_cents) / Decimal(100)).quantize(Decimal('0.01'))
            ),
            service_duration_minutes_at_booking=service.duration_minutes,
            grace_period_ends_at=now + timedelta(minutes=grace_minutes),
        )

        return Response(
            {
                'id': booking.id,
                'status': booking.status,
                'slot_at': booking.slot_at.isoformat(),
                'grace_period_ends_at': (
                    booking.grace_period_ends_at.isoformat()
                    if booking.grace_period_ends_at else None
                ),
                'service': _booking_service_view(booking),
                'provider': _provider_to_dict(service.provider),
            },
            status=status.HTTP_201_CREATED,
        )


class RescheduleBookingView(APIView):
    """POST /api/beauty/protected/bookings/<id>/reschedule/

    Body: { "slot_at": "<iso-8601>" }

    Owner-only. Booking must still be active and upcoming. The new slot
    is validated against the same provider's weekly hours and existing
    bookings (excluding this booking itself, so it doesn't block its
    own move).
    """

    def post(self, request, booking_id):
        customer_id = _require_customer(request)
        if customer_id is None:
            return Response({'detail': 'Customers only.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            booking = (
                BeautyBooking.objects.select_related('service', 'service__provider')
                .get(id=booking_id, customer_id=customer_id)
            )
        except BeautyBooking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        now = datetime.now(timezone.utc)
        if booking.status != BeautyBooking.STATUS_BOOKED:
            return Response(
                {'detail': 'Only active bookings can be rescheduled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if booking.slot_at <= now:
            return Response(
                {'detail': 'Past bookings cannot be rescheduled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slot_at_raw = (request.data.get('slot_at') or '').strip()
        if not slot_at_raw:
            return Response(
                {'detail': 'slot_at is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            normalized = slot_at_raw.replace('Z', '+00:00')
            slot_at = datetime.fromisoformat(normalized)
            if slot_at.tzinfo is None:
                slot_at = slot_at.replace(tzinfo=timezone.utc)
        except ValueError:
            return Response(
                {'detail': 'slot_at must be ISO-8601.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ok, err = is_slot_available(
            booking.service, slot_at, exclude_booking_id=booking.id,
        )
        if not ok:
            return Response(
                {'detail': err or 'Slot is not available.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.slot_at = slot_at
        booking.save(update_fields=['slot_at'])

        return Response(
            {
                'id': booking.id,
                'status': booking.status,
                'slot_at': booking.slot_at.isoformat(),
            },
            status=status.HTTP_200_OK,
        )


class CancelBookingView(APIView):
    """POST /api/beauty/protected/bookings/<id>/cancel/ — owner cancels.

    After the grace period this is the regular customer-initiated
    cancellation: status becomes ``cancelled_by_customer`` and NO
    automatic refund is triggered. To cancel within the grace period
    (with refund + hidden from past list) use ``CancelBookingGraceView``.
    """

    def post(self, request, booking_id):
        customer_id = _require_customer(request)
        if customer_id is None:
            return Response({'detail': 'Customers only.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            booking = BeautyBooking.objects.get(id=booking_id, customer_id=customer_id)
        except BeautyBooking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status != BeautyBooking.STATUS_BOOKED:
            return Response(
                {'detail': 'Only active bookings can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Customer-initiated cancellation after grace period — no refund.
        booking.status = BeautyBooking.STATUS_CANCELLED_BY_CUSTOMER
        booking.save(update_fields=['status'])

        return Response({'id': booking.id, 'status': booking.status}, status=status.HTTP_200_OK)


class CancelBookingGraceView(APIView):
    """POST /api/beauty/protected/bookings/<id>/cancel-grace/

    Customer cancels within the grace period — status becomes
    ``cancelled_immediate`` and the booking is hidden from the past
    list. Refund SHOULD be triggered (TODO: Stripe). Refuses if the
    grace window has already expired.
    """

    def post(self, request, booking_id):
        customer_id = _require_customer(request)
        if customer_id is None:
            return Response({'detail': 'Customers only.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            booking = BeautyBooking.objects.get(id=booking_id, customer_id=customer_id)
        except BeautyBooking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status != BeautyBooking.STATUS_BOOKED:
            return Response(
                {'detail': 'Only active bookings can be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = datetime.now(timezone.utc)
        if not booking.grace_period_ends_at or now >= booking.grace_period_ends_at:
            return Response(
                {'detail': 'Grace period has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = BeautyBooking.STATUS_CANCELLED_IMMEDIATE
        booking.save(update_fields=['status'])
        # TODO: trigger Stripe refund for grace-period cancellation.

        return Response({'id': booking.id, 'status': booking.status}, status=status.HTTP_200_OK)
