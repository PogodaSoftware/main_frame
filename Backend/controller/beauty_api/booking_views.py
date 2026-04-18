"""
Beauty Booking API Views
========================
Customer-facing read endpoints (categories, providers, services) and
protected write endpoints (bookings) for the Beauty marketplace.

The mutating endpoints live under `/api/beauty/protected/bookings/` so
the existing BeautyAuthMiddleware enforces a valid customer session.
"""

from datetime import datetime, timezone

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


def _service_to_dict(svc: BeautyService) -> dict:
    return {
        'id': svc.id,
        'name': svc.name,
        'description': svc.description,
        'price_cents': svc.price_cents,
        'duration_minutes': svc.duration_minutes,
        'category': svc.category,
    }


def _provider_to_dict(p: BeautyProvider) -> dict:
    return {
        'id': p.id,
        'name': p.name,
        'short_description': p.short_description,
        'location_label': p.location_label,
    }


VALID_CATEGORIES = {c[0] for c in BeautyService.CATEGORY_CHOICES}


class CategoryListView(APIView):
    """GET /api/beauty/categories/<slug>/ — providers offering this category."""

    def get(self, request, category):
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
    """GET /api/beauty/providers/<id>/ — provider profile + all services."""

    def get(self, request, provider_id):
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
    """GET /api/beauty/services/<id>/ — single-service info for booking screens."""

    def get(self, request, service_id):
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
            .order_by('-slot_at')
        )
        now = datetime.now(timezone.utc)
        return Response(
            {
                'bookings': [
                    {
                        'id': b.id,
                        'status': b.status,
                        'slot_at': b.slot_at.isoformat(),
                        'is_upcoming': b.status == BeautyBooking.STATUS_BOOKED and b.slot_at > now,
                        'service': _service_to_dict(b.service),
                        'provider': _provider_to_dict(b.service.provider),
                    }
                    for b in bookings
                ],
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

        booking = BeautyBooking.objects.create(
            customer=customer,
            service=service,
            slot_at=slot_at,
        )

        return Response(
            {
                'id': booking.id,
                'status': booking.status,
                'slot_at': booking.slot_at.isoformat(),
                'service': _service_to_dict(service),
                'provider': _provider_to_dict(service.provider),
            },
            status=status.HTTP_201_CREATED,
        )


class CancelBookingView(APIView):
    """POST /api/beauty/protected/bookings/<id>/cancel/ — owner cancels."""

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

        booking.status = BeautyBooking.STATUS_CANCELLED
        booking.save(update_fields=['status'])

        return Response({'id': booking.id, 'status': booking.status}, status=status.HTTP_200_OK)
