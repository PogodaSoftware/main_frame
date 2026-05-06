"""Wizard step 4 — Reuse the weekly availability editor."""

from beauty_api.availability_service import ensure_storefront, get_weekly_hours

from . import _business_wizard as w
from ..services import hateoas_service as h
from ..services.application_gate import resolve_business_or_redirect


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    business, app, redirect = resolve_business_or_redirect(request, device_id)
    if redirect is not None:
        return redirect
    if app.status == 'accepted':
        return h.redirect_envelope('beauty_business_home', 'application_accepted')
    if not app.is_step_complete('stripe'):
        return h.redirect_envelope('beauty_business_application_stripe', 'previous_step_incomplete')
    storefront = ensure_storefront(business)
    weekly = get_weekly_hours(storefront)
    return w.envelope(
        'beauty_business_application_schedule',
        'schedule',
        request,
        device_id,
        extras={
            'weekly_hours': weekly,
            'availability_href': '/api/beauty/protected/business/availability/',
            'availability_method': 'PUT',
        },
    )
