"""Business Application Gate
=============================
Shared helper used by every business resolver. Resolves the authenticated
business + their application row in one place and decides whether the
caller should be allowed into the requested portal screen or redirected
into the onboarding wizard.

A new business that just signed up has no application row → we send them
to step 1 (``beauty_business_application_entity``). A business with a
draft/submitted/rejected application is bounced to the first incomplete
step (or the review screen if every step is done but ToS isn't yet
accepted). Only ``status == accepted`` unlocks the portal.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import (
    BusinessProvider,
    BusinessProviderApplication,
)
from . import hateoas_service as h
from .auth_service import get_authenticated_user


_STEP_TO_SCREEN = {
    'entity':   'beauty_business_application_entity',
    'services': 'beauty_business_application_services',
    'stripe':   'beauty_business_application_stripe',
    'schedule': 'beauty_business_application_schedule',
    'tools':    'beauty_business_application_tools',
}


def _get_or_create_application(business: BusinessProvider) -> BusinessProviderApplication:
    app, _ = BusinessProviderApplication.objects.get_or_create(
        business_provider=business,
        defaults={'business_name': business.business_name},
    )
    return app


def first_incomplete_screen(app: BusinessProviderApplication) -> str:
    nxt = app.next_incomplete_step()
    if nxt is None:
        return 'beauty_business_application_review'
    return _STEP_TO_SCREEN.get(nxt, 'beauty_business_application_entity')


def resolve_business_or_redirect(request, device_id: str):
    """Return ``(business, application, redirect_envelope_or_None)``.

    Caller checks the third value: if non-None, return it directly from
    the resolver (it's a redirect envelope); otherwise proceed.
    """
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user:
        return None, None, h.redirect_envelope('beauty_business_login', 'auth_required')
    if user.get('user_type') != 'business':
        return None, None, h.redirect_envelope('beauty_home', 'wrong_user_type')
    try:
        business = BusinessProvider.objects.get(id=user['user_id'])
    except BusinessProvider.DoesNotExist:
        return None, None, h.redirect_envelope('beauty_business_login', 'account_missing')
    app = _get_or_create_application(business)
    return business, app, None


def gate_portal(request, device_id: str, *, allow_screens: tuple[str, ...] = ()):
    """Gate every business portal screen behind an accepted application.

    ``allow_screens`` lets the wizard screens themselves opt out — the
    wizard has to render even though the application is still incomplete.

    Returns ``(business, application, redirect_envelope_or_None)``.
    """
    business, app, redirect = resolve_business_or_redirect(request, device_id)
    if redirect is not None:
        return None, None, redirect
    return business, app, None


def redirect_to_wizard_if_incomplete(app: BusinessProviderApplication):
    """If the application isn't accepted, return a redirect envelope to
    the next incomplete step. Otherwise None (caller proceeds)."""
    if app.status == BusinessProviderApplication.STATUS_ACCEPTED:
        return None
    target = first_incomplete_screen(app)
    return h.redirect_envelope(target, 'application_incomplete')
