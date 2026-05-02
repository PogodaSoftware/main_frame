"""Wizard final screen — Review every captured field, accept ToS, submit.

Submit endpoint: POST /api/beauty/protected/business/application/submit/
"""

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
    nxt = app.next_incomplete_step()
    if nxt is not None:
        return h.redirect_envelope(
            w.STEP_SCREENS[nxt], 'previous_step_incomplete',
        )
    storefront = ensure_storefront(business)
    weekly = get_weekly_hours(storefront)
    category_lookup = {c['value']: c['label'] for c in w.CATEGORY_OPTIONS}
    tool_lookup = {t['value']: t['label'] for t in w.TOOL_OPTIONS}
    extras = {
        'tos_text': w.TOS_TEXT,
        'submit_application_href': '/api/beauty/protected/business/application/submit/',
        'submit_application_method': 'POST',
        'success_screen': 'beauty_business_home',
        'weekly_hours': weekly,
        'category_labels': [
            category_lookup.get(c, c) for c in (app.selected_categories or [])
        ],
        'tool_labels': [
            tool_lookup.get(t, t) for t in (app.third_party_tools or [])
        ],
    }
    return w.envelope(
        'beauty_business_application_review',
        'review',
        request,
        device_id,
        extras=extras,
    )
