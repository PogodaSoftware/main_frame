"""
Beauty admin audit logging helper.

Single entry point `log_event()` used by REST views to append a row to
`BeautyAdminAuditEvent`. Failures here MUST NOT break the calling
operation — audit is best-effort. We swallow exceptions and log to
stderr instead.
"""

import logging

from .models import BeautyAdminAuditEvent, BeautyAdminPrincipal

logger = logging.getLogger(__name__)


def _extract_ip(request) -> str | None:
    """Resolve the client IP behind any reverse proxy."""
    if request is None:
        return None
    xff = (request.META.get('HTTP_X_FORWARDED_FOR') or '').strip()
    if xff:
        return xff.split(',')[0].strip() or None
    return request.META.get('REMOTE_ADDR') or None


def _resolve_role(user: dict | None) -> str:
    """Look up the admin role for the authenticated principal."""
    if not user:
        return ''
    user_type = (user.get('user_type') or '').strip().lower()
    user_id = user.get('user_id')
    if not user_type or not isinstance(user_id, int):
        return ''
    p = BeautyAdminPrincipal.objects.filter(
        user_type=user_type, user_id=user_id,
    ).only('role').first()
    return p.role if p else ''


def log_event(
    *,
    request,
    user: dict | None,
    action: str,
    target_type: str = '',
    target_id: str | int = '',
    target_label: str = '',
    meta: dict | None = None,
) -> None:
    """
    Append an audit event. Best-effort: catches and logs any error so the
    surrounding write operation is never blocked.
    """
    try:
        BeautyAdminAuditEvent.objects.create(
            actor_user_type=(user or {}).get('user_type') or '',
            actor_user_id=(user or {}).get('user_id'),
            actor_email=(user or {}).get('email') or '',
            actor_role=_resolve_role(user),
            action=action,
            target_type=target_type or '',
            target_id=str(target_id) if target_id else '',
            target_label=target_label or '',
            meta=meta or {},
            ip=_extract_ip(request),
        )
    except Exception:
        logger.warning('Failed to write audit event %s', action, exc_info=True)
