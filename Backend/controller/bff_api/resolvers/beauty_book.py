"""
Beauty Book Resolver
====================
Renders the booking screen for a single `BeautyService`. The screen shows
service & provider info plus a small set of pre-computed time slots the
customer can pick from. Submission goes to `POST /api/beauty/protected/bookings/`.

Auth required — redirects unauthenticated visitors to `beauty_login`.

`params` must contain `serviceId` (the service primary key).
"""

from datetime import datetime, time, timedelta, timezone

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyService, BeautySession
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


SLOT_HOURS = (10, 13, 16)  # 10:00, 13:00, 16:00 local-ish UTC slots
SLOT_DAYS = 5


def _slot_options() -> list[dict]:
    """Build a small grid of pickable upcoming slots."""
    now = datetime.now(timezone.utc)
    base = (now + timedelta(days=1)).date()
    options = []
    for day_offset in range(SLOT_DAYS):
        day = base + timedelta(days=day_offset)
        for hour in SLOT_HOURS:
            slot = datetime.combine(day, time(hour=hour, tzinfo=timezone.utc))
            iso = slot.isoformat()
            options.append({
                'value': iso,
                'label': slot.strftime('%a %b %-d · %-I:%M %p'),
            })
    return options


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    params = params or {}
    raw_id = params.get('serviceId') or params.get('service_id')

    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or user.get('user_type') != 'customer':
        return h.redirect_envelope('beauty_login', 'auth_required')

    try:
        service_id = int(raw_id)
    except (TypeError, ValueError):
        return h.redirect_envelope('beauty_home', 'invalid_service')

    try:
        svc = BeautyService.objects.select_related('provider').get(id=service_id)
    except BeautyService.DoesNotExist:
        return h.redirect_envelope('beauty_home', 'service_not_found')

    return {
        'action': 'render',
        'screen': 'beauty_book',
        'data': {
            'service': {
                'id': svc.id,
                'name': svc.name,
                'description': svc.description,
                'price_cents': svc.price_cents,
                'duration_minutes': svc.duration_minutes,
                'category': svc.category,
            },
            'provider': {
                'id': svc.provider.id,
                'name': svc.provider.name,
                'location_label': svc.provider.location_label,
            },
            'form': {
                'submit_method': 'POST',
                'submit_href': '/api/beauty/protected/bookings/',
                'success_screen': 'beauty_booking_success',
                # Client substitutes :bookingId with the booking id
                # returned in the POST response body.
                'success_route_template': '/pogoda/beauty/bookings/:bookingId/success',
                'fields': [
                    {
                        'name': 'service_id',
                        'type': 'hidden',
                        'value': svc.id,
                    },
                    {
                        'name': 'slot_at',
                        'type': 'select',
                        'label': 'Pick a time',
                        'required': True,
                        'options': _slot_options(),
                    },
                ],
                'submit_label': 'Confirm booking',
            },
        },
        'meta': {'title': f'Book — {svc.name}'},
        '_links': {
            'self': h.self_link('beauty_book', params={'serviceId': svc.id}),
            'provider': h.screen_link(
                'provider', 'beauty_provider_detail',
                prompt='Back to provider', params={'id': svc.provider.id},
            ),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
        },
    }
