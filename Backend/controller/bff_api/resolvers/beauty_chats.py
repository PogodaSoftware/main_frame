"""Beauty Chats Resolver — list of the signed-in user's open chats.

One screen serves both customer and business sessions; the resolver
inspects ``user_type`` from the validated auth dict and queries either
the customer's bookings or the business's incoming bookings.

A chat row is "open" iff:
    - the booking is not cancelled in any flavor, AND
    - now is before ``slot_at + duration + 24h`` (chat retention).

Auth required — redirects unauthenticated visitors to ``beauty_login``.
"""

from datetime import datetime, timezone

from beauty_api import chat_service
from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import (
    BeautyBooking,
    BeautyChatMessage,
    BeautyProvider,
)

from ..services import hateoas_service as h
from ..services.auth_service import get_authenticated_user


def _redirect_login() -> dict:
    return h.redirect_envelope('beauty_login', 'auth_required')


def _customer_threads(user_id: int, now) -> list[dict]:
    qs = (
        BeautyBooking.objects.select_related('service', 'service__provider')
        .filter(customer_id=user_id)
    )
    return _build_threads(qs, viewer_type='customer', now=now)


def _business_threads(user_id: int, now) -> list[dict]:
    provider_ids = list(
        BeautyProvider.objects.filter(business_provider_id=user_id).values_list('id', flat=True)
    )
    qs = (
        BeautyBooking.objects.select_related('service', 'service__provider', 'customer')
        .filter(service__provider_id__in=provider_ids)
    )
    return _build_threads(qs, viewer_type='business', now=now)


def _build_threads(qs, *, viewer_type: str, now) -> list[dict]:
    out: list[dict] = []
    for b in qs:
        if b.status in BeautyBooking.CANCELLED_STATUSES:
            continue
        expires = chat_service.chat_expires_at(b)
        if now >= expires:
            chat_service.prune_expired_for(b, now=now)
            continue
        last = (
            BeautyChatMessage.objects.filter(booking_id=b.id)
            .order_by('-created_at', '-id').first()
        )
        peer = (
            b.service.provider.name or 'Business'
            if viewer_type == 'customer'
            else b.customer.email
        )
        item = {
            'booking_id': b.id,
            'service_name': b.display_service_name,
            'slot_at': b.slot_at.isoformat(),
            'slot_label': b.slot_at.strftime('%a %b %-d · %-I:%M %p UTC'),
            'status': b.status,
            'peer_name': peer,
            'last_message': last.body if last else '',
            'last_at': last.created_at.isoformat() if last else None,
            'is_active': chat_service.is_chat_active(b, now=now),
            'expires_at': expires.isoformat(),
            '_links': {
                'open': h.screen_link(
                    'open', 'beauty_chat_thread',
                    prompt='Open chat', params={'bookingId': b.id},
                ),
            },
        }
        out.append(item)
    out.sort(key=lambda x: x['last_at'] or x['slot_at'], reverse=True)
    return out


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user:
        return _redirect_login()

    user_type = user.get('user_type')
    user_id = user.get('user_id')
    now = datetime.now(timezone.utc)

    if user_type == 'customer':
        threads = _customer_threads(user_id, now)
        nav_links = {
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
            'profile': h.screen_link('profile', 'beauty_profile', prompt='Profile'),
            'bookings': h.screen_link('bookings', 'beauty_bookings', prompt='Bookings'),
            'chats': h.screen_link('chats', 'beauty_chats', prompt='Chat'),
        }
    elif user_type == 'business':
        threads = _business_threads(user_id, now)
        nav_links = {
            'home': h.screen_link('home', 'beauty_business_home', prompt='Home'),
            'profile': h.screen_link('profile', 'beauty_business_profile', prompt='Profile'),
            'bookings': h.screen_link('bookings', 'beauty_business_bookings', prompt='Bookings'),
            'chats': h.screen_link('chats', 'beauty_chats', prompt='Chat'),
        }
    else:
        return _redirect_login()

    return {
        'action': 'render',
        'screen': 'beauty_chats',
        'data': {
            'threads': threads,
            'viewer_type': user_type,
            'total': len(threads),
        },
        'meta': {'title': 'Messages'},
        '_links': {
            'self': h.self_link('beauty_chats'),
            **nav_links,
        },
    }
