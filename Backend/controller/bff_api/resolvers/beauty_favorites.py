"""Beauty Favorites Resolver — the customer's saved-services list.

Ports the list payload from ``beauty_api.favorite_views``; each row
carries an ``unfavorite`` (DELETE) action-link and a ``provider`` nav
link. Customers only.

Auth required — non-customers are redirected home, anonymous to login.
"""

from beauty_api.favorite_views import _favorite_payload
from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyFavorite, BeautySession
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user:
        return h.redirect_envelope('beauty_login', 'auth_required')
    if user.get('user_type') != BeautySession.USER_TYPE_CUSTOMER:
        return h.redirect_envelope('beauty_home', 'customers_only')

    uid = user.get('user_id')
    rows = (
        BeautyFavorite.objects
        .filter(customer_id=uid)
        .select_related('service', 'service__provider')
        .order_by('-created_at', '-id')
    )

    items = []
    for r in rows:
        payload = _favorite_payload(r)
        href = f'/api/beauty/protected/services/{r.service_id}/favorite/'
        payload['_links'] = {
            'unfavorite': h.link(rel='unfavorite', href=href, method='DELETE', prompt='Remove'),
            'provider': h.screen_link('provider', 'beauty_provider_detail', prompt='View', params={'id': r.service.provider_id}),
        }
        items.append(payload)

    return {
        'action': 'render',
        'screen': 'beauty_favorites',
        'data': {'items': items, 'count': len(items)},
        'meta': {'title': 'Saved'},
        '_links': {
            'self': h.self_link('beauty_favorites'),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
        },
    }
