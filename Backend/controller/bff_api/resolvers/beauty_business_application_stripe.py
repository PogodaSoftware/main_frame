"""Wizard step 3 — Stripe stand-in. No real gateway call."""

from . import _business_wizard as w
from ..services import hateoas_service as h
from ..services.application_gate import resolve_business_or_redirect


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    business, app, redirect = resolve_business_or_redirect(request, device_id)
    if redirect is not None:
        return redirect
    if app.status == 'accepted':
        return h.redirect_envelope('beauty_business_home', 'application_accepted')
    if not app.is_step_complete('services'):
        return h.redirect_envelope('beauty_business_application_services', 'previous_step_incomplete')
    return w.envelope(
        'beauty_business_application_stripe',
        'stripe',
        request,
        device_id,
        extras={
            'stripe_copy': (
                'Stripe Connect lets us send payouts straight to your bank '
                'account when customers pay for bookings. The full flow is '
                'coming soon — for now, click below to mark this step '
                'complete and continue your application.'
            ),
        },
    )
