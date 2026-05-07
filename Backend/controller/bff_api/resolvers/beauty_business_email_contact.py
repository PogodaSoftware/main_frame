"""Beauty Business Email & Contact Resolver

Renders the Email & Contact edit page used by the redesigned Settings →
Account → "Email & contact" row. Reads from BusinessProvider; the form
PATCHes back to /api/beauty/protected/business/account/contact/.
"""

from beauty_api.availability_service import ensure_storefront

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

    ensure_storefront(business)

    return {
        'action': 'render',
        'screen': 'beauty_business_email_contact',
        'data': {
            'contact': {
                'email': business.email,
                'public_email': business.public_email or '',
                'contact_phone': business.contact_phone or '',
                'show_phone_publicly': bool(business.show_phone_publicly),
            },
            'submit_method': 'PATCH',
            'submit_href': '/api/beauty/protected/business/account/contact/',
        },
        'meta': {'title': 'Email & contact'},
        '_links': {
            'self': h.self_link('beauty_business_email_contact'),
            'settings': h.screen_link(
                'settings', 'beauty_business_settings', prompt='Settings',
            ),
            'business_home': h.screen_link(
                'business_home', 'beauty_business_home', prompt='Dashboard',
            ),
        },
    }
