"""Beauty Business Settings Resolver

Settings menu for the gear icon on the business home. Exposes three
actions plus sign-out:
  - change_password
  - schedule (open/close hours editor)
  - delete_account
  - logout
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
        'screen': 'beauty_business_settings',
        'data': {
            'business': {
                'email': business.email,
                'business_name': business.business_name,
            },
        },
        'meta': {'title': 'Settings'},
        '_links': {
            'self': h.self_link('beauty_business_settings'),
            'business_home': h.screen_link(
                'business_home', 'beauty_business_home', prompt='Dashboard',
            ),
            'change_password': h.screen_link(
                'change_password', 'beauty_business_change_password',
                prompt='Change password',
            ),
            'email_contact': h.screen_link(
                'email_contact', 'beauty_business_email_contact',
                prompt='Email & contact',
            ),
            'services': h.screen_link(
                'services', 'beauty_business_services', prompt='Services',
            ),
            'schedule': h.screen_link(
                'schedule', 'beauty_business_availability',
                prompt='Open / closed hours',
            ),
            'delete_account': h.link(
                rel='delete_account',
                href='/api/beauty/protected/business/account/delete/',
                method='POST',
                screen='beauty_home',
                route=h.SCREEN_ROUTES['beauty_home'],
                prompt='Delete account',
            ),
            'logout': h.link(
                rel='logout',
                href='/api/beauty/business/logout/',
                method='POST',
                screen='beauty_business_login',
                route=h.SCREEN_ROUTES['beauty_business_login'],
                prompt='Sign out',
            ),
        },
    }
