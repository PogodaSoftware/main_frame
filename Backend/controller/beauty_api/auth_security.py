"""
Beauty Auth Security Helpers
============================
Single home for the cross-role / rate-limit / audit-log primitives used
by the Beauty signup and login views.

Why a separate module:
    Centralising these helpers keeps the views readable and ensures the
    customer and business auth surfaces apply identical policy. Tests
    can also patch one place when they need to reset rate-limit state
    between scenarios.
"""

from __future__ import annotations

import logging
import re

from django.core.cache import cache

from .models import BeautyAuthAuditLog, BeautySession, BeautyUser, BusinessProvider

logger = logging.getLogger(__name__)


# Per-IP cross-role failure threshold before subsequent attempts are
# answered with 429. Keep low (5) per the security spec; the cache TTL
# below is the cooldown window after which the counter resets.
RATE_LIMIT_THRESHOLD = 5
RATE_LIMIT_WINDOW_SECONDS = 300  # 5 minutes


def mask_email(email: str) -> str:
    """Return ``a***@example.com``-style mask suitable for logs."""
    if not email or '@' not in email:
        return ''
    local, _, domain = email.partition('@')
    if not local:
        return f'***@{domain}'
    return f'{local[0]}***@{domain}'


def client_ip(request) -> str:
    """Best-effort client IP extraction.

    Trusts the leftmost ``X-Forwarded-For`` entry when present (the proxy
    layer is responsible for stripping spoofed values); otherwise falls
    back to ``REMOTE_ADDR``. Only used for logging + rate-limiting, so a
    spoofed value at worst causes a single attacker to absorb their own
    block — never another user's.
    """
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if xff:
        first = xff.split(',', 1)[0].strip()
        if first:
            return first
    return request.META.get('REMOTE_ADDR', '') or ''


def _ip_cache_key(ip: str) -> str:
    safe = re.sub(r'[^A-Za-z0-9_.:-]', '_', ip or 'unknown')
    return f'beauty_auth_xrole:{safe}'


def is_rate_limited(ip: str) -> bool:
    """True if the IP has hit the cross-role failure threshold."""
    return cache.get(_ip_cache_key(ip), 0) >= RATE_LIMIT_THRESHOLD


def record_xrole_failure(ip: str) -> int:
    """Increment per-IP cross-role failure counter; returns new count."""
    key = _ip_cache_key(ip)
    try:
        return cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=RATE_LIMIT_WINDOW_SECONDS)
        return 1


def reset_xrole_counter(ip: str) -> None:
    """Reset the counter on legitimate success — keeps the threshold
    targeted at attackers, not noisy users sharing a NAT."""
    cache.delete(_ip_cache_key(ip))


def write_audit(event_type: str, *, email: str, ip: str,
                attempted_role: str = '', existing_role: str = '') -> None:
    """Append a row to ``BeautyAuthAuditLog``.

    Audit failures must never break the auth path, so any DB error is
    swallowed and merely logged. The append-only store has no FK fan-in
    so we don't worry about cascading constraints either.
    """
    try:
        BeautyAuthAuditLog.objects.create(
            event_type=event_type,
            masked_email=mask_email(email),
            request_ip=(ip or '')[:64],
            attempted_role=attempted_role or '',
            existing_role=existing_role or '',
        )
    except Exception:
        logger.exception('Failed to write Beauty auth audit row')


def find_existing_role(email: str) -> str:
    """Return the role ('customer' / 'business') that owns ``email``,
    or an empty string when the email is unknown to both tables."""
    if not email:
        return ''
    if BeautyUser.objects.filter(email=email).exists():
        return BeautySession.USER_TYPE_CUSTOMER
    if BusinessProvider.objects.filter(email=email).exists():
        return BeautySession.USER_TYPE_BUSINESS
    return ''
