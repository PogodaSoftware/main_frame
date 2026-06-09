"""Beauty Service Reviews Resolver — paginated reviews for one service.

Ports the list query from ``beauty_api.review_views``; each review the
viewer owns carries a ``delete`` (DELETE) action-link. Offset cursor +
has_more for paging on the service-detail screen.

Auth required — redirects unauthenticated visitors to ``beauty_login``.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyReview, BeautyService
from beauty_api.review_views import (
    REVIEW_LIST_DEFAULT_LIMIT,
    REVIEW_LIST_MAX_LIMIT,
    _aggregate_for_service,
    _coerce_int,
    _review_payload,
)
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user:
        return h.redirect_envelope('beauty_login', 'auth_required')

    params = params or {}
    try:
        service_id = int(params.get('serviceId') or params.get('service_id'))
    except (TypeError, ValueError):
        return h.redirect_envelope('beauty_home', 'invalid_service')
    if not BeautyService.objects.filter(id=service_id).exists():
        return h.redirect_envelope('beauty_home', 'service_not_found')

    offset = _coerce_int(params.get('offset'), 0, minimum=0)
    limit = _coerce_int(
        params.get('limit'), REVIEW_LIST_DEFAULT_LIMIT, minimum=1, maximum=REVIEW_LIST_MAX_LIMIT,
    )

    qs = (
        BeautyReview.objects
        .filter(service_id=service_id)
        .select_related('customer', 'service')
        .order_by('-created_at', '-id')
    )
    window = list(qs[offset:offset + limit + 1])
    has_more = len(window) > limit
    page = window[:limit]

    uid = user.get('user_id')
    utype = user.get('user_type')
    items = []
    for r in page:
        payload = _review_payload(r, viewer_user_id=uid, viewer_user_type=utype)
        if payload.get('is_owner'):
            payload['_links'] = {
                'delete': h.link(
                    rel='delete',
                    href=f'/api/beauty/protected/reviews/{r.id}/',
                    method='DELETE', prompt='Delete',
                ),
            }
        items.append(payload)

    return {
        'action': 'render',
        'screen': 'beauty_service_reviews',
        'data': {
            'items': items,
            'has_more': has_more,
            'next_offset': offset + len(page) if has_more else None,
            'aggregate': _aggregate_for_service(service_id),
        },
        'meta': {'title': 'Reviews'},
        '_links': {
            'self': h.self_link('beauty_service_reviews', params={'serviceId': service_id}),
        },
    }
