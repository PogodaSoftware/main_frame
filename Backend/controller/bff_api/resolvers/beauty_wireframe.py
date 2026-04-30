"""
Beauty Wireframe Resolver
=========================
Returns the wireframe screen for development/debugging purposes.
Auth-gated — anonymous visitors are bounced to login.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user:
        return h.redirect_envelope('beauty_login', 'auth_required')
    return {
        'action': 'render',
        'screen': 'beauty_wireframe',
        'data': {},
        'meta': {'title': 'Beauty - Wireframe'},
        '_links': {
            'self': h.self_link('beauty_wireframe'),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
        },
    }
