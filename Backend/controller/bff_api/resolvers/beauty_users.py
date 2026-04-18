"""
Beauty Users Resolver
=====================
Returns a list of all BeautyUser records for the admin review screen.
Auth-required — redirects to login if no valid session.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyUser
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)

    if not user:
        return h.redirect_envelope('beauty_login', 'auth_required')

    qs = (
        BeautyUser.objects.all()
        .order_by('-created_at')
        .values('id', 'email', 'created_at')
    )

    users = [
        {
            'id': u['id'],
            'email': u['email'],
            'created_at': u['created_at'].isoformat(),
        }
        for u in qs
    ]

    return {
        'action': 'render',
        'screen': 'beauty_users',
        'data': {
            'users': users,
            'total': len(users),
        },
        'meta': {'title': 'Beauty — Users'},
        '_links': {
            'self': h.self_link('beauty_users'),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
        },
    }
