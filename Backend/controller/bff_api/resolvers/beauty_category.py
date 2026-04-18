"""
Beauty Category Resolver
========================
Lists every provider that offers services in the requested category, with
their services nested. Public — no auth required.

`params` must contain `slug` (one of beauty/lashes/nails/makeup).
"""

from beauty_api.models import BeautyService
from ..services import hateoas_service as h


CATEGORY_LABELS = {
    'beauty': 'Beauty',
    'lashes': 'Lashes',
    'nails': 'Nails',
    'makeup': 'Makeup',
}


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    params = params or {}
    slug = (params.get('slug') or '').lower()

    if slug not in CATEGORY_LABELS:
        return h.redirect_envelope('beauty_home', 'unknown_category')

    services = (
        BeautyService.objects.select_related('provider')
        .filter(category=slug)
        .order_by('provider__name', 'name')
    )

    providers: dict[int, dict] = {}
    for svc in services:
        p = svc.provider
        entry = providers.setdefault(
            p.id,
            {
                'id': p.id,
                'name': p.name,
                'short_description': p.short_description,
                'location_label': p.location_label,
                'services': [],
                '_links': {
                    'detail': h.screen_link(
                        'detail', 'beauty_provider_detail',
                        prompt='View provider', params={'id': p.id},
                    ),
                },
            },
        )
        entry['services'].append({
            'id': svc.id,
            'name': svc.name,
            'description': svc.description,
            'price_cents': svc.price_cents,
            'duration_minutes': svc.duration_minutes,
            '_links': {
                'book': h.screen_link(
                    'book', 'beauty_book',
                    prompt='Book', params={'serviceId': svc.id},
                ),
            },
        })

    label = CATEGORY_LABELS[slug]
    return {
        'action': 'render',
        'screen': 'beauty_category',
        'data': {
            'category_slug': slug,
            'category_label': label,
            'providers': list(providers.values()),
            'total_providers': len(providers),
        },
        'meta': {'title': f'Beauty — {label}'},
        '_links': {
            'self': h.self_link('beauty_category', params={'slug': slug}),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
        },
    }
