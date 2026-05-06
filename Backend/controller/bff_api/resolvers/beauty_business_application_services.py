"""Wizard step 2 — Multi-select of service categories."""

from . import _business_wizard as w
from ..services import hateoas_service as h
from ..services.application_gate import resolve_business_or_redirect


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    business, app, redirect = resolve_business_or_redirect(request, device_id)
    if redirect is not None:
        return redirect
    if app.status == 'accepted':
        return h.redirect_envelope('beauty_business_home', 'application_accepted')
    if not app.is_step_complete('entity'):
        return h.redirect_envelope('beauty_business_application_entity', 'previous_step_incomplete')
    return w.envelope(
        'beauty_business_application_services',
        'services',
        request,
        device_id,
        extras={'category_options': w.CATEGORY_OPTIONS},
    )
