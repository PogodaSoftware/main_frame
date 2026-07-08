"""
Beauty Google Auth Resolver
============================
Renders the mock "Continue with Google" account-chooser screen.

The screen lists the pre-seeded demo accounts for the requested user_type
(customer or business). The client POSTs the chosen account to the DEBUG-only
`GoogleMockAuthView` endpoint, which issues a real session cookie.

No real OAuth is performed — this screen is a dev/demo convenience only.
The `submit` link points directly at the non-BFF auth endpoint (same pattern
as the login form's `submit` link pointing at `/api/beauty/login/`).
"""

from ..services import hateoas_service as h

# ---------------------------------------------------------------------------
# Demo account catalogue (must match GoogleMockAuthView allowlist in views.py)
# ---------------------------------------------------------------------------

_CUSTOMER_ACCOUNTS = [
    {'initials': 'AB', 'name': 'Aisha Bell',       'email': 'aisha.bell@gmail.com'},
    {'initials': 'HL', 'name': 'Hugo Lindqvist',   'email': 'hugo.l@startuplabs.io'},
]

_BUSINESS_ACCOUNTS = [
    {'initials': 'SL', 'name': 'Studio Luxe',  'email': 'studio.luxe@gmail.com'},
    {'initials': 'GB', 'name': 'Glow Bar',     'email': 'glow.bar@startuplabs.io'},
]


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    p = params or {}
    raw_type = p.get('user_type') or 'customer'
    user_type = raw_type if raw_type in ('customer', 'business') else 'customer'

    accounts = _CUSTOMER_ACCOUNTS if user_type == 'customer' else _BUSINESS_ACCOUNTS

    back_screen = 'beauty_login' if user_type == 'customer' else 'beauty_business_login'

    links = {
        'self': h.self_link('beauty_google_auth', params={'user_type': user_type}),
        'back': h.screen_link('back', back_screen, prompt='Back'),
        # submit hits the non-BFF mock auth endpoint — same pattern as login
        # form's submit pointing at /api/beauty/login/.
        'submit': h.link(
            rel='submit',
            href='/api/beauty/auth/google/',
            method='POST',
            screen='beauty_google_auth',
            route=h.SCREEN_ROUTES.get('beauty_google_auth'),
        ),
    }

    return {
        'action': 'render',
        'screen': 'beauty_google_auth',
        'data': {
            'user_type': user_type,
            'accounts': accounts,
        },
        'meta': {'title': 'Continue with Google'},
        '_links': links,
    }
