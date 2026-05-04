"""Wizard step 1 — Entity type, applicant name, business name, address, ITIN.

Behaviour: if the application is already accepted, redirect home.
Otherwise render the step regardless of progress so the user can revisit
earlier steps to edit before submission.
"""

from . import _business_wizard as w
from ..services import hateoas_service as h
from ..services.application_gate import resolve_business_or_redirect


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    business, app, redirect = resolve_business_or_redirect(request, device_id)
    if redirect is not None:
        return redirect
    if app.status == 'accepted':
        return h.redirect_envelope('beauty_business_home', 'application_accepted')
    return w.envelope(
        'beauty_business_application_entity',
        'entity',
        request,
        device_id,
    )
