"""
Beauty Forgot Password Resolver
================================
Returns the dynamic form schema for the customer Reset-Password screen.
Direct mirror of the legacy Angular client's `beauty-forgot.component.ts`
flow: a single email field, POST to ``/api/beauty/auth/forgot/``, then
the backend either sends a reset link (200) or silently no-ops on an
unknown email — never leaking which addresses are on file.

Authenticated visitors are bounced home; they don't need the reset path.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)

    if user is not None:
        return h.redirect_envelope('beauty_home', 'already_authenticated')

    links = {
        'self': h.self_link('beauty_forgot'),
        'home': h.screen_link('home', 'beauty_home', prompt='Beauty'),
        'back': h.screen_link('back', 'beauty_login', prompt='Back to sign in'),
        'login': h.screen_link('login', 'beauty_login', prompt='Sign in'),
    }

    form = h.forgot_form(
        footer_links=[
            h.footer_link(
                rel='login',
                cta_class='link-btn',
                group_class='forgot-footer',
                label_prefix='Remembered it?',
            ),
        ],
    )

    return {
        'action': 'render',
        'screen': 'beauty_forgot',
        'data': {
            'links': {k: v['screen'] for k, v in links.items() if v.get('screen')},
        },
        'meta': {'title': 'Beauty - Reset Password'},
        '_links': links,
        'form': form,
    }
