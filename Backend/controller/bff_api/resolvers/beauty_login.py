"""
Beauty Login Resolver
=====================
Returns the screen data for the customer login page.
If the user is already authenticated, redirects them home.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services.auth_service import get_authenticated_user


def resolve(request, screen: str, device_id: str) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)

    if user is not None:
        return {
            'action': 'redirect',
            'redirect_to': 'beauty_home',
            'reason': 'already_authenticated',
        }

    return {
        'action': 'render',
        'screen': 'beauty_login',
        'data': {
            'links': {
                'signup': 'beauty_signup',
                'business_login': 'beauty_business_login',
            },
        },
        'meta': {'title': 'Beauty - Sign In'},
    }
