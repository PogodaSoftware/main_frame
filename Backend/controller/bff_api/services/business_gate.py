"""
Business Portal Gate
====================
Shared auth + application-completed gate for every business-portal BFF
resolver. Centralises the three boilerplate checks every business screen
performs:

  1. Cookie-backed authentication (delegates to ``auth_service``).
  2. ``user_type == 'business'`` (customers must never see business UI).
  3. ``BusinessProvider.application_completed`` — every page except the
     application wizard itself redirects to the wizard until the
     onboarding flow is finished.

Usage
-----
::

    business, redirect = require_onboarded_business(request, device_id)
    if redirect:
        return redirect

The resolver gets back the loaded ``BusinessProvider`` on success or a
ready-to-return redirect envelope on any failure. ``require_business``
is the same helper but skips the application-completed gate so the
wizard resolver itself can use it.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BusinessProvider
from .auth_service import get_authenticated_user
from . import hateoas_service as h


def _load_business(user: dict) -> BusinessProvider | None:
    try:
        return BusinessProvider.objects.get(id=user['user_id'])
    except BusinessProvider.DoesNotExist:
        return None


def require_business(request, device_id: str) -> tuple[BusinessProvider | None, dict | None]:
    """Authenticate as a business provider. Does NOT gate on onboarding."""
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user:
        return None, h.redirect_envelope('beauty_business_login', 'auth_required')
    if user.get('user_type') != 'business':
        return None, h.redirect_envelope('beauty_home', 'wrong_user_type')
    business = _load_business(user)
    if business is None:
        return None, h.redirect_envelope('beauty_business_login', 'account_missing')
    return business, None


def require_onboarded_business(
    request, device_id: str,
) -> tuple[BusinessProvider | None, dict | None]:
    """Same as require_business, but also redirects to the wizard until
    ``application_completed`` is True."""
    business, redirect = require_business(request, device_id)
    if redirect:
        return None, redirect
    if not business.application_completed:
        return None, h.redirect_envelope(
            'beauty_business_application', 'onboarding_required',
        )
    return business, None
