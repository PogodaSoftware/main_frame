"""
Beauty Booking Detail Resolver
==============================
Renders a single booking's details (service, provider, slot, status).
Owner-scoped — a customer can only view their own bookings.

For active upcoming bookings, exposes a HATEOAS `cancel` link. Always
exposes a `provider` link to the provider profile and a `bookings`
link back to the My Bookings list.

`params` must contain `id` (the booking primary key).
"""

from datetime import datetime, timezone

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyBooking
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or user.get('user_type') != 'customer':
        return h.redirect_envelope('beauty_login', 'auth_required')

    params = params or {}
    raw_id = params.get('id') or params.get('bookingId')
    try:
        booking_id = int(raw_id)
    except (TypeError, ValueError):
        return h.redirect_envelope('beauty_bookings', 'invalid_booking')

    try:
        b = (
            BeautyBooking.objects.select_related('service', 'service__provider')
            .get(id=booking_id, customer_id=user['user_id'])
        )
    except BeautyBooking.DoesNotExist:
        return h.redirect_envelope('beauty_bookings', 'booking_not_found')

    now = datetime.now(timezone.utc)
    is_upcoming = b.status == BeautyBooking.STATUS_BOOKED and b.slot_at > now

    links: dict = {
        'self': h.self_link('beauty_booking_detail', params={'id': b.id}),
        'bookings': h.screen_link('bookings', 'beauty_bookings', prompt='Back to My Bookings'),
        'provider': h.screen_link(
            'provider', 'beauty_provider_detail',
            prompt='View provider', params={'id': b.service.provider.id},
        ),
        'home': h.screen_link('home', 'beauty_home', prompt='Home'),
    }
    if is_upcoming:
        links['reschedule'] = h.screen_link(
            'reschedule', 'beauty_reschedule',
            prompt='Reschedule', params={'bookingId': b.id},
        )
        links['cancel'] = h.link(
            'cancel',
            method='POST',
            href=f'/api/beauty/protected/bookings/{b.id}/cancel/',
            prompt='Cancel this booking',
        )

    return {
        'action': 'render',
        'screen': 'beauty_booking_detail',
        'data': {
            'booking': {
                'id': b.id,
                'status': b.status,
                'is_upcoming': is_upcoming,
                'slot_at': b.slot_at.isoformat(),
                'slot_label': b.slot_at.strftime('%A %b %-d · %-I:%M %p UTC'),
                'service': {
                    'id': b.service.id,
                    'name': b.service.name,
                    'description': b.service.description,
                    'price_cents': b.service.price_cents,
                    'duration_minutes': b.service.duration_minutes,
                    'category': b.service.category,
                },
                'provider': {
                    'id': b.service.provider.id,
                    'name': b.service.provider.name,
                    'short_description': b.service.provider.short_description,
                    'location_label': b.service.provider.location_label,
                },
            },
        },
        'meta': {'title': 'Booking details'},
        '_links': links,
    }
