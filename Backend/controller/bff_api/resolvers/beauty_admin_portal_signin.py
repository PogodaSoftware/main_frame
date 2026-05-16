"""
Beauty Admin Portal — Sign-in resolver
======================================

Renders the slate-themed admin sign-in screen. Unauthenticated visitors land
here; authenticated admins are forwarded to the 2FA step (or dashboard if
2FA is already satisfied for this session in the future).

Submit follows the existing customer login HTTP endpoint. The admin gate
runs on the next resolve via `is_beauty_admin`; non-admins authenticating
through this form get bounced to the customer home, which is intentional
since the existence of /admin/portal is not advertised.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)

    # Already signed in as an admin → forward to 2FA step.
    if user and h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_2fa', 'already_authenticated')

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_signin',
        'data': {
            'eyebrow': 'Admin sign-in',
            'title': 'Sign in to admin',
            'sub': (
                'Restricted access. Activity is logged for audit. Connect through '
                'the company VPN if signing in from a new network.'
            ),
            'ip_allowlist_label': '198.51.100.0/24',
        },
        'meta': {'title': 'Beauty — Admin sign-in'},
        '_links': {
            'self': h.self_link('beauty_admin_portal_signin'),
            'submit': h.link(
                rel='submit',
                href='/api/beauty/login/',
                method='POST',
                screen='beauty_admin_portal_2fa',
                route=h.SCREEN_ROUTES.get('beauty_admin_portal_2fa'),
                prompt='Continue',
            ),
            'magic': h.screen_link(
                'magic', 'beauty_admin_portal_magic', prompt='Use magic link'
            ),
            'ip_warning': h.screen_link(
                'ip_warning', 'beauty_admin_portal_ip_warning',
                prompt='Network restricted',
            ),
        },
    }
