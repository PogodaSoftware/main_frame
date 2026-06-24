"""
Customer resolver shared helpers
=================================
Auth guard and parameter coercion extracted from customer-facing resolvers.

Only apply `require_customer_auth` to resolvers whose unauthenticated AND
non-customer paths both redirect to `beauty_login` with reason `auth_required`.
Resolvers with diverging redirect logic (e.g. beauty_favorites, beauty_chats)
must keep their own auth block.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def require_customer_auth(request, device_id: str):
    """
    Validate the beauty_auth cookie as a customer session.

    Returns ``(user_dict, None)`` on success.
    Returns ``(None, redirect_envelope)`` when auth fails or user_type != 'customer'.
    Callers must return the redirect immediately when it is not None.
    """
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or user.get('user_type') != 'customer':
        return None, h.redirect_envelope('beauty_login', 'auth_required')
    return user, None


def coerce_int_param(raw_value, redirect_screen: str, redirect_reason: str):
    """
    Coerce ``raw_value`` to ``int``.

    ``raw_value`` is the already-extracted param value (caller handles multi-key
    fallback with ``or`` before calling this helper).

    Returns ``(int_value, None)`` on success.
    Returns ``(None, redirect_envelope)`` when coercion fails.
    Callers must return the redirect immediately when it is not None.
    """
    try:
        return int(raw_value), None
    except (TypeError, ValueError):
        return None, h.redirect_envelope(redirect_screen, redirect_reason)
