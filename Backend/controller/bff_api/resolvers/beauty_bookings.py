"""
Beauty Bookings Resolver
========================
Shows the signed-in customer's bookings, separated into upcoming vs past.
Each upcoming booking exposes a HATEOAS `cancel` link.

Auth required — redirects unauthenticated visitors to `beauty_login`.
"""

from datetime import datetime, timezone

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyBooking, BeautySession
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or user.get('user_type') != 'customer':
        return h.redirect_envelope('beauty_login', 'auth_required')

    bookings = (
        BeautyBooking.objects.select_related('service', 'service__provider')
        .filter(customer_id=user['user_id'])
        .order_by('-slot_at')
    )

    now = datetime.now(timezone.utc)
    upcoming = []
    past = []
    for b in bookings:
        item = {
            'id': b.id,
            'status': b.status,
            'slot_at': b.slot_at.isoformat(),
            'slot_label': b.slot_at.strftime('%a %b %-d · %-I:%M %p UTC'),
            'service': {
                'id': b.service.id,
                'name': b.service.name,
                'price_cents': b.service.price_cents,
                'duration_minutes': b.service.duration_minutes,
            },
            'provider': {
                'id': b.service.provider.id,
                'name': b.service.provider.name,
                'location_label': b.service.provider.location_label,
            },
        }
        provider_link = h.screen_link(
            'provider', 'beauty_provider_detail',
            prompt='View provider', params={'id': b.service.provider.id},
        )
        if b.status == BeautyBooking.STATUS_BOOKED and b.slot_at > now:
            item['_links'] = {
                'cancel': h.link(
                    'cancel',
                    method='POST',
                    href=f'/api/beauty/protected/bookings/{b.id}/cancel/',
                    prompt='Cancel',
                ),
                'provider': provider_link,
            }
            upcoming.append(item)
        else:
            item['_links'] = {'provider': provider_link}
            past.append(item)

    return {
        'action': 'render',
        'screen': 'beauty_bookings',
        'data': {
            'upcoming': upcoming,
            'past': past,
            'total': len(upcoming) + len(past),
        },
        'meta': {'title': 'My Bookings'},
        '_links': {
            'self': h.self_link('beauty_bookings'),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
            'profile': h.screen_link('profile', 'beauty_profile', prompt='Profile'),
        },
    }
