"""Wizard step 5 — Optional third-party integrations checkboxes."""

from . import _business_wizard as w
from ..services import hateoas_service as h
from ..services.application_gate import resolve_business_or_redirect


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    business, app, redirect = resolve_business_or_redirect(request, device_id)
    if redirect is not None:
        return redirect
    if app.status == 'accepted':
        return h.redirect_envelope('beauty_business_home', 'application_accepted')
    if not app.is_step_complete('schedule'):
        return h.redirect_envelope('beauty_business_application_schedule', 'previous_step_incomplete')
    return w.envelope(
        'beauty_business_application_tools',
        'tools',
        request,
        device_id,
        extras={'tool_options': w.TOOL_OPTIONS},
    )
