"""Beauty Chat Thread Resolver — single-booking conversation view.

Renders all messages for one booking's chat. The same screen serves
both customer and business sessions; the resolver checks the booking
ownership and returns 404 (redirect to chat list) if the principal
isn't a party.

Eligibility
-----------
Chat is only unlocked once a booking exists between the parties. If
the booking is cancelled or older than 24h after service end, the
``send`` link is omitted so the input is disabled — and the messages
list returns empty after the lazy prune.
"""

from datetime import datetime, timezone

from beauty_api import chat_service
from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyBooking

from ..services import hateoas_service as h
from ..services.auth_service import get_authenticated_user


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user:
        return h.redirect_envelope('beauty_login', 'auth_required')

    user_type = user.get('user_type')
    user_id = user.get('user_id')
    booking_id_raw = (params or {}).get('bookingId')
    try:
        booking_id = int(booking_id_raw)
    except (TypeError, ValueError):
        return h.redirect_envelope('beauty_chats', 'missing_booking')

    try:
        booking = (
            BeautyBooking.objects.select_related('service', 'service__provider', 'customer')
            .get(id=booking_id)
        )
    except BeautyBooking.DoesNotExist:
        return h.redirect_envelope('beauty_chats', 'not_found')

    if not chat_service.can_user_access(booking, user_id=user_id, user_type=user_type):
        return h.redirect_envelope('beauty_chats', 'forbidden')

    now = datetime.now(timezone.utc)
    chat_service.prune_expired_for(booking, now=now)
    active = chat_service.is_chat_active(booking, now=now)
    messages = chat_service.list_messages(booking)

    if user_type == 'customer':
        peer = booking.service.provider.name or 'Business'
        nav_back = h.screen_link('back', 'beauty_chats', prompt='Back')
        home_screen = 'beauty_home'
        profile_screen = 'beauty_profile'
    else:
        peer = booking.customer.email
        nav_back = h.screen_link('back', 'beauty_chats', prompt='Back')
        home_screen = 'beauty_business_home'
        profile_screen = 'beauty_business_profile'

    links: dict = {
        'self': h.self_link('beauty_chat_thread', params={'bookingId': booking.id}),
        'back': nav_back,
        'chats': h.screen_link('chats', 'beauty_chats', prompt='Chat'),
        'home': h.screen_link('home', home_screen, prompt='Home'),
        'profile': h.screen_link('profile', profile_screen, prompt='Profile'),
    }
    if active:
        links['send'] = h.link(
            rel='send',
            href=f'/api/beauty/protected/bookings/{booking.id}/chat/send/',
            method='POST',
            prompt='Send',
        )

    return {
        'action': 'render',
        'screen': 'beauty_chat_thread',
        'data': {
            'booking_id': booking.id,
            'service_name': booking.display_service_name,
            'slot_at': booking.slot_at.isoformat(),
            'slot_label': booking.slot_at.strftime('%a %b %-d · %-I:%M %p UTC'),
            'peer_name': peer,
            'viewer_type': user_type,
            'is_active': active,
            'expires_at': chat_service.chat_expires_at(booking).isoformat(),
            'messages': messages,
        },
        'meta': {'title': f'Chat · {peer}'},
        '_links': links,
    }
