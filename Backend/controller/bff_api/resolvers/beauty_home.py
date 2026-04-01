"""
Beauty Home Resolver
====================
Determines what the Beauty home screen should show.
Orchestrates: AuthService + BeautyConfigService.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services.auth_service import get_authenticated_user
from ..services.beauty_config_service import get_beauty_config


def resolve(request, screen: str, device_id: str) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    config = get_beauty_config()

    return {
        'action': 'render',
        'screen': 'beauty_home',
        'data': {
            'is_authenticated': user is not None,
            'user_email': user['email'] if user else None,
            'user_type': user['user_type'] if user else None,
            'business_name': user['business_name'] if user else None,
            'services': config['services'],
            'google_maps_key_present': config['google_maps_key_present'],
        },
        'meta': {'title': 'Beauty - Home'},
    }
