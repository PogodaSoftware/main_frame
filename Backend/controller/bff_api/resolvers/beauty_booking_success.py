"""
Beauty Booking Success Resolver
===============================
Renders the confirmation screen shown immediately after a customer
completes a booking. Returns the new booking's details plus HATEOAS
links to My Bookings and Home.

Auth required — redirects unauthenticated visitors to `beauty_login`.

`params` must contain `bookingId` (the freshly-created booking's PK).
"""

from datetime import datetime, timezone

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyBooking
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h
from ..services.beauty_timezone_service import provider_timezone as _provider_timezone


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

    now = datetime.now(timezone.utc)
    in_grace_window = (
        booking.status == BeautyBooking.STATUS_BOOKED
        and booking.grace_period_ends_at is not None
        and now < booking.grace_period_ends_at
    )

    links = {
        'self': h.self_link('beauty_booking_success', params={'bookingId': booking.id}),
        'bookings': h.screen_link('bookings', 'beauty_bookings', prompt='My Bookings'),
        'detail': h.screen_link(
            'detail', 'beauty_booking_detail',
            prompt='View booking', params={'id': booking.id},
        ),
        'home': h.screen_link('home', 'beauty_home', prompt='Back to Home'),
        'chats': h.screen_link('chats', 'beauty_chats', prompt='Chat'),
        'profile': h.screen_link('profile', 'beauty_profile', prompt='Profile'),
        'chat_thread': h.screen_link(
            'chat_thread', 'beauty_chat_thread',
            prompt='Message provider', params={'bookingId': booking.id},
        ),
    }
    if in_grace_window:
        links['cancel_grace'] = h.link(
            'cancel_grace',
            method='POST',
            href=f'/api/beauty/protected/bookings/{booking.id}/cancel-grace/',
            prompt='Cancel free',
        )

    return {
        'action': 'render',
        'screen': 'beauty_booking_success',
        'data': {
            'booking': {
                'id': booking.id,
                'status': booking.status,
                'slot_at': booking.slot_at.isoformat(),
                'slot_label': booking.slot_at.strftime('%A %b %-d · %-I:%M %p UTC'),
                'grace_period_ends_at': (
                    booking.grace_period_ends_at.isoformat()
                    if booking.grace_period_ends_at else None
                ),
                'in_grace_window': in_grace_window,
                'service': {
                    'id': booking.service.id,
                    'name': booking.display_service_name,
                    'price_cents': booking.display_price_cents,
                    'duration_minutes': booking.display_duration_minutes,
                },
                'provider': {
                    'id': booking.service.provider.id,
                    'name': booking.service.provider.name,
                    'location_label': booking.service.provider.location_label,
                    'timezone': _provider_timezone(booking.service.provider),
                },
            },
        },
        'meta': {'title': 'Booking confirmed'},
        '_links': links,
    }
