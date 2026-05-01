"""
Auth Microservice
=================
Single responsibility: validate the beauty auth cookie + device_id and
return the authenticated user's details, or None if not authenticated.

Triggered per BFF resolve request. Never stores state — every call is
a fresh validation against the signed cookie and the session DB record.

Cookie security envelope (set by `_set_auth_cookie` in `beauty_api.views`):
    - HttpOnly: True            — no JS access (XSS-resistant).
    - Secure:   not DEBUG       — production-only, dev still works on http.
    - SameSite: Lax             — top-level nav allowed, cross-site POST/fetch blocked.
    - Path:     /
    - Max-Age:  SESSION_MAX_AGE_SECONDS (24h).

Cookie rotation
---------------
The cookie is NOT auto-rotated on every request — that would invalidate
the previous tab's cookie and confuse multi-tab users. Instead the
client opts in by calling ``POST /api/beauty/session/refresh/`` shortly
before expiry; the endpoint validates the existing cookie and reissues
a fresh one with a new ``issued_at`` and a new BeautySession row hash.
A successful refresh is otherwise transparent — no other state changes.
"""

import hashlib
import logging
from datetime import datetime, timezone

from django.core import signing

# SESSION_COOKIE_NAME is intentionally NOT imported here — this service
# receives the cookie value already extracted by the resolver, so it
# never has to know the cookie's key name.
from beauty_api.middleware import SESSION_MAX_AGE_SECONDS
from beauty_api.models import BeautySession, BeautyUser, BusinessProvider

logger = logging.getLogger(__name__)


def get_authenticated_user(cookie_value: str, device_id: str) -> dict | None:
    """
    Validates the auth cookie against the device_id.

    Returns a user-info dict on success, None on any failure.

    The caller must never cache or store the returned dict — it should be
    fetched fresh on every BFF resolve call so the UI always reflects the
    current server-side session state.
    """
    if not cookie_value or not device_id:
        return None

    try:
        payload = signing.loads(cookie_value, max_age=SESSION_MAX_AGE_SECONDS)
    except signing.SignatureExpired:
        logger.debug('Auth cookie expired during BFF resolve.')
        return None
    except signing.BadSignature:
        logger.warning('Bad cookie signature during BFF resolve (device: %s)', device_id)
        return None
    except Exception:
        return None

    required_fields = ('user_id', 'user_type', 'device_id', 'issued_at')
    if not all(f in payload for f in required_fields):
        return None

    if payload['device_id'] != device_id:
        logger.debug(
            'Device ID mismatch during BFF resolve. Token device: %s, Request device: %s',
            payload.get('device_id'),
            device_id,
        )
        return None

    token_hash = hashlib.sha256(cookie_value.encode()).hexdigest()
    session_valid = BeautySession.objects.filter(
        token_hash=token_hash,
        user_id=payload['user_id'],
        user_type=payload['user_type'],
        device_id=payload['device_id'],
        is_active=True,
        expires_at__gt=datetime.now(timezone.utc),
    ).exists()

    if not session_valid:
        logger.debug('No active session found for user %s during BFF resolve.', payload.get('user_id'))
        return None

    user_id = payload['user_id']
    user_type = payload['user_type']

    try:
        if user_type == BeautySession.USER_TYPE_CUSTOMER:
            user = BeautyUser.objects.get(id=user_id)
            return {
                'user_id': user_id,
                'user_type': 'customer',
                'email': user.email,
                'business_name': None,
            }
        else:
            provider = BusinessProvider.objects.get(id=user_id)
            return {
                'user_id': user_id,
                'user_type': 'business',
                'email': provider.email,
                'business_name': provider.business_name,
            }
    except (BeautyUser.DoesNotExist, BusinessProvider.DoesNotExist):
        logger.error('Session exists but user %s/%s not found in DB.', user_type, user_id)
        return None
