"""
WebSocket auth middleware for the beauty real-time chat.

Primary scheme: a short-lived signed **ticket** minted by the authenticated
REST endpoint `/api/beauty/protected/chat/ws-ticket/` and passed on the WS
handshake as `?ticket=&device_id=`. This avoids replaying the long-lived
`beauty_auth` cookie over the socket (RN's WebSocket can't reliably attach
it). Falls back to the cookie if no ticket is supplied.

On success populates `scope['beauty_user_id']` / `['beauty_user_type']`;
on failure leaves them None and the consumer closes the socket.
"""

from datetime import datetime, timezone
from urllib.parse import parse_qs, unquote

from channels.db import database_sync_to_async
from django.core import signing

from .chat_views import WS_TICKET_MAX_AGE, WS_TICKET_SALT
from .middleware import SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, _hash_token
from .models import BeautySession


def _cookie_value(scope, name):
    for key, val in scope.get('headers', []):
        if key == b'cookie':
            for part in val.decode('latin1').split(';'):
                part = part.strip()
                if '=' in part:
                    k, v = part.split('=', 1)
                    if k.strip() == name:
                        v = v.strip()
                        if len(v) >= 2 and v[0] == '"' and v[-1] == '"':
                            v = v[1:-1]
                        return unquote(v)
    return None


def _session_active(user_id, user_type, device_id) -> bool:
    return BeautySession.objects.filter(
        user_id=user_id, user_type=user_type, device_id=device_id,
        is_active=True, expires_at__gt=datetime.now(timezone.utc),
    ).exists()


@database_sync_to_async
def _resolve_ticket(ticket, device_id):
    try:
        payload = signing.loads(ticket, salt=WS_TICKET_SALT, max_age=WS_TICKET_MAX_AGE)
    except Exception:
        return None, None
    if not device_id or payload.get('device_id') != device_id:
        return None, None
    if not _session_active(payload['user_id'], payload['user_type'], device_id):
        return None, None
    return payload['user_id'], payload['user_type']


@database_sync_to_async
def _resolve_cookie(raw_cookie, device_id):
    try:
        payload = signing.loads(raw_cookie, max_age=SESSION_MAX_AGE_SECONDS)
    except Exception:
        return None, None
    if not all(f in payload for f in ('user_id', 'user_type', 'device_id', 'issued_at')):
        return None, None
    if not device_id or payload['device_id'] != device_id:
        return None, None
    ok = BeautySession.objects.filter(
        token_hash=_hash_token(raw_cookie),
        user_id=payload['user_id'], user_type=payload['user_type'],
        device_id=payload['device_id'], is_active=True,
        expires_at__gt=datetime.now(timezone.utc),
    ).exists()
    if not ok:
        return None, None
    return payload['user_id'], payload['user_type']


class CookieAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        scope['beauty_user_id'] = None
        scope['beauty_user_type'] = None

        qs = parse_qs(scope.get('query_string', b'').decode('utf-8'))
        device_id = (qs.get('device_id') or [None])[0]
        ticket = (qs.get('ticket') or [None])[0]

        if ticket and device_id:
            uid, ut = await _resolve_ticket(ticket, device_id)
        else:
            raw_cookie = _cookie_value(scope, SESSION_COOKIE_NAME)
            uid, ut = await _resolve_cookie(raw_cookie, device_id) if (raw_cookie and device_id) else (None, None)

        scope['beauty_user_id'] = uid
        scope['beauty_user_type'] = ut
        return await self.app(scope, receive, send)
