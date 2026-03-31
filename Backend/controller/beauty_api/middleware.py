"""
Beauty Auth Middleware
=====================
Validates the HttpOnly auth cookie on protected Beauty API routes.

Cookie payload (Django-signed):
  {
    "user_id":   int,
    "user_type": "customer" | "business",
    "device_id": str,
    "issued_at": ISO-8601 timestamp
  }

On every protected request the middleware:
  1. Reads the `beauty_auth` HttpOnly cookie.
  2. Verifies the Django signature (tamper-proof).
  3. Checks the 24-hour expiry window.
  4. Confirms the device_id in the cookie matches the
     X-Device-ID request header sent by the frontend.
  5. Confirms the session record is still active in the DB.

If any check fails the middleware returns HTTP 401 so the
Angular guard can redirect the user to the login page.
"""

import hashlib
import json
import logging
from datetime import datetime, timezone

from django.core import signing
from django.http import JsonResponse

from .models import BeautySession

logger = logging.getLogger(__name__)

SESSION_COOKIE_NAME = 'beauty_auth'
DEVICE_ID_HEADER = 'HTTP_X_DEVICE_ID'
SESSION_MAX_AGE_SECONDS = 86400  # 24 hours

PROTECTED_PREFIXES = [
    '/api/beauty/protected/',
]


def _is_protected(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in PROTECTED_PREFIXES)


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


class BeautyAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if _is_protected(request.path):
            error = self._validate(request)
            if error:
                return JsonResponse({'detail': error}, status=401)

        return self.get_response(request)

    def _validate(self, request):
        raw_cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
        if not raw_cookie:
            return 'Authentication cookie missing.'

        try:
            payload = signing.loads(
                raw_cookie,
                max_age=SESSION_MAX_AGE_SECONDS,
            )
        except signing.SignatureExpired:
            return 'Session has expired. Please log in again.'
        except signing.BadSignature:
            logger.warning(
                'Bad cookie signature from %s',
                request.META.get('REMOTE_ADDR'),
            )
            return 'Invalid session token.'
        except Exception:
            return 'Invalid session token.'

        required_fields = ('user_id', 'user_type', 'device_id', 'issued_at')
        if not all(field in payload for field in required_fields):
            return 'Malformed session token.'

        request_device_id = request.META.get(DEVICE_ID_HEADER, '').strip()
        if not request_device_id:
            return 'Device identifier missing.'

        if payload['device_id'] != request_device_id:
            logger.warning(
                'Device ID mismatch for user %s/%s',
                payload.get('user_type'),
                payload.get('user_id'),
            )
            return 'Device mismatch. Please log in on this device.'

        token_hash = _hash_token(raw_cookie)
        session_exists = BeautySession.objects.filter(
            token_hash=token_hash,
            user_id=payload['user_id'],
            user_type=payload['user_type'],
            device_id=payload['device_id'],
            is_active=True,
            expires_at__gt=datetime.now(timezone.utc),
        ).exists()

        if not session_exists:
            return 'Session is no longer valid. Please log in again.'

        request.beauty_user_id = payload['user_id']
        request.beauty_user_type = payload['user_type']
        request.beauty_device_id = payload['device_id']
        return None
