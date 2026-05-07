"""Beauty Business Change Password Resolver

Renders the change-password form. The component owns its own UI (two
password fields + submit) so we just emit the submit link, success
target, and a back link to the settings menu.
"""

from ..services import hateoas_service as h
from ..services.application_gate import (
    redirect_to_wizard_if_incomplete,
    resolve_business_or_redirect,
)


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    business, app, redirect = resolve_business_or_redirect(request, device_id)
    if redirect is not None:
        return redirect
    gate = redirect_to_wizard_if_incomplete(app)
    if gate is not None:
        return gate

    return {
        'action': 'render',
        'screen': 'beauty_business_change_password',
        'data': {
            'business': {
                'email': business.email,
                'business_name': business.business_name,
            },
            'submit_href': '/api/beauty/protected/business/account/password/',
            'submit_method': 'POST',
        },
        'meta': {'title': 'Change password'},
        '_links': {
            'self': h.self_link('beauty_business_change_password'),
            'settings': h.screen_link(
                'settings', 'beauty_business_settings', prompt='Settings',
            ),
            'business_home': h.screen_link(
                'business_home', 'beauty_business_home', prompt='Dashboard',
            ),
        },
    }
