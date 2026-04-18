"""
Beauty Home Resolver
====================
Determines what the Beauty home screen should show.
Orchestrates: AuthService + BeautyConfigService + HateoasService.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services.auth_service import get_authenticated_user
from ..services.beauty_config_service import get_beauty_config
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    config = get_beauty_config()

    links: dict = {'self': h.self_link('beauty_home')}

    if user is None:
        links['login'] = h.screen_link('login', 'beauty_login', prompt='Sign in')
        if h.is_signup_enabled():
            links['signup'] = h.screen_link('signup', 'beauty_signup', prompt='Sign up')
        if h.is_business_login_enabled():
            links['business_login'] = h.screen_link(
                'business_login',
                'beauty_business_login',
                prompt='Business sign in',
            )
    else:
        # Authenticated users: include the logout action and a profile badge.
        logout_path = (
            '/api/beauty/business/logout/'
            if user['user_type'] == 'business'
            else '/api/beauty/logout/'
        )
        links['logout'] = h.link(
            rel='logout',
            href=logout_path,
            method='POST',
            screen='beauty_home',
            route=h.SCREEN_ROUTES['beauty_home'],
            prompt='Sign out',
        )

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
        '_links': links,
    }
