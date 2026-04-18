"""
Beauty Sessions Resolver
=========================
Returns a list of all BeautySession records for the admin review screen.
Auth-required — redirects to login if no valid session.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautySession
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)

    if not user:
        return h.redirect_envelope('beauty_login', 'auth_required')

    qs = (
        BeautySession.objects.all()
        .order_by('-created_at')
        .values(
            'id', 'user_id', 'user_type', 'device_id',
            'is_active', 'expires_at', 'created_at',
        )
    )

    sessions = [
        {
            'id': s['id'],
            'user_id': s['user_id'],
            'user_type': s['user_type'],
            'device_id': s['device_id'],
            'is_active': s['is_active'],
            'expires_at': s['expires_at'].isoformat(),
            'created_at': s['created_at'].isoformat(),
        }
        for s in qs
    ]

    return {
        'action': 'render',
        'screen': 'beauty_sessions',
        'data': {
            'sessions': sessions,
            'total': len(sessions),
        },
        'meta': {'title': 'Beauty — Sessions'},
        '_links': {
            'self': h.self_link('beauty_sessions'),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
        },
    }
