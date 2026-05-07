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


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
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
        # Authenticated users: customer-only profile / bookings entry points,
        # business users get a portal entry point. Logout shown for both.
        if user['user_type'] == 'customer':
            links['bookings'] = h.screen_link(
                'bookings', 'beauty_bookings', prompt='My Bookings',
            )
            links['chats'] = h.screen_link(
                'chats', 'beauty_chats', prompt='Chat',
            )
            links['profile'] = h.screen_link(
                'profile', 'beauty_profile', prompt='Profile',
            )
        elif user['user_type'] == 'business':
            links['business_home'] = h.screen_link(
                'business_home', 'beauty_business_home', prompt='Business Portal',
            )
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

    # Per-category navigation link for each tile on the home services row.
    services = []
    for entry in config['services']:
        slug = entry.get('slug')
        services.append({
            **entry,
            '_links': {
                'category': h.screen_link(
                    'category', 'beauty_category',
                    prompt=entry['label'], params={'slug': slug},
                ) if slug else None,
            },
        })

    return {
        'action': 'render',
        'screen': 'beauty_home',
        'data': {
            'is_authenticated': user is not None,
            'user_email': user['email'] if user else None,
            'user_type': user['user_type'] if user else None,
            'business_name': user['business_name'] if user else None,
            'services': services,
            'google_maps_key_present': config['google_maps_key_present'],
        },
        'meta': {'title': 'Beauty - Home'},
        '_links': links,
    }
