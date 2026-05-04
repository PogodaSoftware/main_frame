"""
Beauty Business Availability Resolver
=====================================
Renders the weekly business-hours editor for the signed-in provider's
storefront. Always emits exactly 7 rows (Mon..Sun) — the service layer
auto-creates any missing day with a sensible default so the UI never
has to handle partial data.

Auth required — non-business users are redirected to the business login.
"""

from beauty_api.availability_service import ensure_storefront, get_weekly_hours
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

    storefront = ensure_storefront(business)
    weekly = get_weekly_hours(storefront)

    return {
        'action': 'render',
        'screen': 'beauty_business_availability',
        'data': {
            'storefront': {'id': storefront.id, 'name': storefront.name},
            'weekly_hours': weekly,
            'submit_method': 'PUT',
            'submit_href': '/api/beauty/protected/business/availability/',
        },
        'meta': {'title': 'Weekly hours'},
        '_links': {
            'self': h.self_link('beauty_business_availability'),
            'business_home': h.screen_link(
                'business_home', 'beauty_business_home', prompt='Dashboard',
            ),
            'services': h.screen_link(
                'services', 'beauty_business_services', prompt='Manage services',
            ),
            'bookings': h.screen_link(
                'bookings', 'beauty_business_bookings', prompt='View bookings',
            ),
        },
    }
