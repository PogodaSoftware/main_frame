"""
Beauty Provider Detail Resolver
===============================
Returns a provider profile with the full list of services. Each service
exposes a HATEOAS `book` link the shell uses to navigate into the booking
flow. Auth-gated — anonymous visitors are bounced to login.

`params` must contain `id` (the provider primary key).
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyProvider
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user:
        return h.redirect_envelope('beauty_login', 'auth_required')

    params = params or {}
    raw_id = params.get('id')
    try:
        provider_id = int(raw_id)
    except (TypeError, ValueError):
        return h.redirect_envelope('beauty_home', 'invalid_provider')

    try:
        provider = BeautyProvider.objects.prefetch_related('services').get(id=provider_id)
    except BeautyProvider.DoesNotExist:
        return h.redirect_envelope('beauty_home', 'provider_not_found')

    services = list(provider.services.all().order_by('category', 'name'))

    return {
        'action': 'render',
        'screen': 'beauty_provider_detail',
        'data': {
            'provider': {
                'id': provider.id,
                'name': provider.name,
                'short_description': provider.short_description,
                'long_description': provider.long_description,
                'location_label': provider.location_label,
            },
            'services': [
                {
                    'id': s.id,
                    'name': s.name,
                    'description': s.description,
                    'category': s.category,
                    'price_cents': s.price_cents,
                    'duration_minutes': s.duration_minutes,
                    '_links': {
                        'book': h.screen_link(
                            'book', 'beauty_book',
                            prompt='Book', params={'serviceId': s.id},
                        ),
                    },
                }
                for s in services
            ],
        },
        'meta': {'title': f'Beauty — {provider.name}'},
        '_links': {
            'self': h.self_link('beauty_provider_detail', params={'id': provider.id}),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
        },
    }
