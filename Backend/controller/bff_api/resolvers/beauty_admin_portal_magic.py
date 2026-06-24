"""
Beauty Admin Portal — Magic-link backup resolver
================================================

Visual-only first pass. POST send-link + GET consume-token endpoints will
land with `BeautyAdminMagicLink`.

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
        'screen': 'beauty_admin_portal_magic',
        'data': {
            'eyebrow': 'Backup access',
            'title': 'Email me a sign-in link',
            'sub': "We'll send a one-time link to your work email. Link expires in 5 minutes and can only be used once.",
            'resend_in': '00:48',
            'sent_to': user.email,
        },
        'meta': {'title': 'Beauty — Admin magic-link'},
        '_links': {
            'self': h.self_link('beauty_admin_portal_magic'),
            'send': h.link(
                rel='send',
                href='/api/beauty/admin/portal/magic/send/',
                method='POST',
                screen='beauty_admin_portal_magic',
                route=h.SCREEN_ROUTES.get('beauty_admin_portal_magic'),
                prompt='Send magic link',
            ),
            'back': h.screen_link(
                'back', 'beauty_admin_portal_signin', prompt='Back to sign-in',
            ),
        },
    }
