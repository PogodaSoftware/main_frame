"""
Beauty Admin Portal — 2FA / TOTP resolver
=========================================

Visual-only first pass. Renders the 6-digit code entry screen. Real TOTP
verification (BeautyAdminTotpSecret + drift window + recovery codes) lands
when the full-backend auth phase wires up.

Gating: requires a valid admin session. Non-admins (including unauthenticated
requests) are redirected to beauty_admin_portal_signin.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services import hateoas_service as h
from ..services.auth_service import get_authenticated_user


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_2fa',
        'data': {
            'eyebrow': 'Step 2 of 2',
            'title': "Verify it's you",
            'sub': 'Open your authenticator app and enter the 6-digit code for Beauty Admin.',
            'expires_in': '00:24',
        },
        'meta': {'title': 'Beauty — Admin 2FA'},
        '_links': {
            'self': h.self_link('beauty_admin_portal_2fa'),
            'submit': h.link(
                rel='submit',
                href='/api/beauty/admin/portal/2fa/verify/',
                method='POST',
                screen='beauty_admin_portal_dashboard',
                route=h.SCREEN_ROUTES.get('beauty_admin_portal_dashboard'),
                prompt='Verify',
            ),
            'recovery': h.link(
                rel='recovery', href=None, method='NAV',
                screen='beauty_admin_portal_signin',
                route=h.SCREEN_ROUTES.get('beauty_admin_portal_signin'),
                prompt='Use recovery code',
            ),
            'magic': h.screen_link(
                'magic', 'beauty_admin_portal_magic', prompt='Email magic link',
            ),
            'back': h.screen_link(
                'back', 'beauty_admin_portal_signin', prompt='Back',
            ),
        },
    }
