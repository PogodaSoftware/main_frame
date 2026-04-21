"""
Beauty Booking Success Resolver
===============================
Renders the confirmation screen shown immediately after a customer
completes a booking. Returns the new booking's details plus HATEOAS
links to My Bookings and Home.

Auth required — redirects unauthenticated visitors to `beauty_login`.

`params` must contain `bookingId` (the freshly-created booking's PK).
"""

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
    raw_id = params.get('bookingId') or params.get('id')
    try:
        booking_id = int(raw_id)
    except (TypeError, ValueError):
        return h.redirect_envelope('beauty_bookings', 'invalid_booking')

    try:
        booking = (
            BeautyBooking.objects.select_related('service', 'service__provider')
            .get(id=booking_id, customer_id=user['user_id'])
        )
    except BeautyBooking.DoesNotExist:
        return h.redirect_envelope('beauty_bookings', 'booking_not_found')

    return {
        'action': 'render',
        'screen': 'beauty_booking_success',
        'data': {
            'booking': {
                'id': booking.id,
                'status': booking.status,
                'slot_at': booking.slot_at.isoformat(),
                'slot_label': booking.slot_at.strftime('%A %b %-d · %-I:%M %p UTC'),
                'service': {
                    'id': booking.service.id,
                    'name': booking.service.name,
                    'price_cents': booking.service.price_cents,
                    'duration_minutes': booking.service.duration_minutes,
                },
                'provider': {
                    'id': booking.service.provider.id,
                    'name': booking.service.provider.name,
                    'location_label': booking.service.provider.location_label,
                },
            },
        },
        'meta': {'title': 'Booking confirmed'},
        '_links': {
            'self': h.self_link('beauty_booking_success', params={'bookingId': booking.id}),
            'bookings': h.screen_link('bookings', 'beauty_bookings', prompt='My Bookings'),
            'detail': h.screen_link(
                'detail', 'beauty_booking_detail',
                prompt='View booking', params={'id': booking.id},
            ),
            'home': h.screen_link('home', 'beauty_home', prompt='Back to Home'),
        },
    }
