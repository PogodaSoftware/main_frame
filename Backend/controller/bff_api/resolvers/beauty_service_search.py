"""Beauty Service Search Resolver — BFF-native infinite-scroll search.

Ports the query logic from ``beauty_api.search_views``; each result item
carries ``book`` / ``provider`` nav links plus ``favorite`` (POST) and
``unfavorite`` (DELETE) action-links, so the customer marketplace search
needs no direct REST. Offset cursor + has_more for paging.

Auth required — redirects unauthenticated visitors to ``beauty_login``.
"""

from django.db.models import Q

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyFavorite, BeautyService, BeautySession
from beauty_api.search_views import (
    SEARCH_DEFAULT_LIMIT,
    SEARCH_MAX_LIMIT,
    _bool_param,
    _coerce_int,
    _proximity_distance,
    _service_payload,
)
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user:
        return h.redirect_envelope('beauty_login', 'auth_required')

    params = params or {}
    q = (params.get('q') or '').strip()
    location = (params.get('location') or '').strip()
    offset = _coerce_int(params.get('offset'), 0, minimum=0)
    limit = _coerce_int(
        params.get('limit'), SEARCH_DEFAULT_LIMIT, minimum=1, maximum=SEARCH_MAX_LIMIT,
    )
    include_future = _bool_param(params.get('includeFuture'), True)

    qs = BeautyService.objects.select_related('provider')
    if q:
        qs = qs.filter(
            Q(name__icontains=q)
            | Q(description__icontains=q)
            | Q(provider__name__icontains=q)
        )
    if not include_future:
        qs = qs.filter(is_future=False)
    if location:
        qs = qs.filter(
            Q(service_locations__contains=[location])
            | Q(service_locations=[])
            | Q(provider__location_label__icontains=location)
        )
    qs = qs.order_by('id')

    if location:
        window = list(qs[offset:offset + (limit * 3) + 1])
        for s in window:
            s._distance_km = _proximity_distance(s, location)
        window.sort(key=lambda s: (s._distance_km, s.id))
        page = window[:limit]
        has_more = len(window) > limit
    else:
        window = list(qs[offset:offset + limit + 1])
        has_more = len(window) > limit
        page = window[:limit]
    next_offset = offset + len(page) if has_more else None

    favorited_ids: set[int] = set()
    uid = user.get('user_id')
    utype = user.get('user_type')
    if utype == BeautySession.USER_TYPE_CUSTOMER and uid and page:
        favorited_ids = set(
            BeautyFavorite.objects
            .filter(customer_id=uid, service_id__in=[s.id for s in page])
            .values_list('service_id', flat=True)
        )

    items = []
    for s in page:
        payload = _service_payload(s, favorited_ids=favorited_ids)
        payload['_links'] = {
            'book': h.screen_link('book', 'beauty_book', prompt='Book', params={'serviceId': s.id}),
            'provider': h.screen_link('provider', 'beauty_provider_detail', prompt='View', params={'id': s.provider.id}),
            **h.service_favorite_links(s.id),
        }
        items.append(payload)

    return {
        'action': 'render',
        'screen': 'beauty_service_search',
        'data': {
            'items': items,
            'next_offset': next_offset,
            'has_more': has_more,
            'query': {
                'q': q, 'location': location, 'offset': offset,
                'limit': limit, 'includeFuture': include_future,
            },
        },
        'meta': {'title': 'Search'},
        '_links': {
            'self': h.self_link('beauty_service_search'),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
        },
    }
