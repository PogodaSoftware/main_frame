"""
Beauty Admin Portal — Audit log resolver
========================================

Read-only timeline of admin actions. Backed by BeautyAdminAuditEvent.
"""

import re
from datetime import datetime, timezone
from html import escape

from django.db.models import Q

from beauty_api.models import BeautyAdminAuditEvent
from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services import hateoas_service as h
from ..services.auth_service import get_authenticated_user


_PAGE_SIZE = 50

# Visual mapping of action prefix → row color + icon hint. The frontend
# uses the `icon` string to pick an inline SVG; we keep the same vocabulary
# as the JSX reference (suspend, verify, impersonate, export, warn, info).
_ACTION_STYLE = {
    'account.suspend':       ('#C0392B', 'suspend',    'suspended'),
    'account.reinstate':     ('#2F7A47', 'verify',     'reinstated'),
    'account.export':        ('#0F1115', 'export',     'exported account data for'),
    'team.invite':           ('#2F7A47', 'verify',     'invited'),
    'team.invite_consumed':  ('#2F7A47', 'verify',     'accepted invite for'),
    'team.role':             ('#7A5A1F', 'info',       'changed role of'),
    'team.revoke':           ('#C0392B', 'suspend',    'revoked admin access for'),
    'tag.create':            ('#7DA8CF', 'info',       'created tag'),
    'note.create':           ('#7DA8CF', 'info',       'added note to'),
    'message.send':          ('#7DA8CF', 'info',       'messaged'),
    'ticket.create':         ('#7DA8CF', 'info',       'opened ticket'),
    'ticket.assign':         ('#7DA8CF', 'info',       'assigned ticket'),
    'ticket.status':         ('#7DA8CF', 'info',       'updated ticket status'),
}


def _initials(email: str) -> str:
    """Derive two-letter initials from an actor e-mail address.

    Mirrors the logic in the team resolver's _initials() — email-local branch
    only (we have no display name on audit events).
    E.g.  "maria@beauty.io"  → "MA"
          "j.smith@co.io"    → "JS"
          "bob@co.io"        → "BO"
    """
    if not email:
        return 'AA'
    local = email.split('@', 1)[0]
    bits = [b for b in re.split(r'[._-]', local) if b]
    if len(bits) >= 2:
        return (bits[0][:1] + bits[1][:1]).upper()
    init = local[:2].upper()
    # Pad single-character locals (e.g. "a@b.io") so the badge is always 2 chars.
    return (init * 2)[:2] if init else 'AA'


def _humanize_age(dt) -> str:
    if not dt:
        return '—'
    s = int((datetime.now(timezone.utc) - dt).total_seconds())
    if s < 60:
        return f'{s}s'
    if s < 3600:
        return f'{s // 60}m'
    if s < 86400:
        return f'{s // 3600}h'
    return f'{s // 86400}d'


def _row(e: BeautyAdminAuditEvent) -> dict:
    color, icon, verb = _ACTION_STYLE.get(e.action, ('#6B6F77', 'info', e.action))
    actor = escape(e.actor_email or '—')
    target_raw = e.target_label or e.target_id or e.target_type or ''
    target = escape(target_raw)
    if target:
        title_html = f'<b>{actor}</b> {verb} <b>{target}</b>'
    else:
        title_html = f'<b>{actor}</b> {verb}'

    meta_parts = []
    if e.actor_role:
        meta_parts.append(f'ACL: {e.actor_role}')
    if e.ip:
        meta_parts.append(f'IP {e.ip}')
    # Skip 'reason' — it is surfaced in its own dedicated column so we avoid
    # showing it twice (once in the reason column, once inside the meta blob).
    for k, v in (e.meta or {}).items():
        if k == 'reason':
            continue
        if v in (None, '', [], {}):
            continue
        meta_parts.append(f'{k}: {v}')

    return {
        # ── Original timeline fields (kept for backward-compat) ──────────────
        'id': e.id,
        'when_label': _humanize_age(e.created_at),
        'when_iso': e.created_at.isoformat(),
        'icon': icon,
        'color': color,
        'title_html': title_html,
        'meta': ' · '.join(meta_parts),
        'action': e.action,
        'actor_email': e.actor_email,
        # ── New columnar fields for the desktop <table> ──────────────────────
        'actor_initials': _initials(e.actor_email or ''),
        'actor_role': e.actor_role or '',
        'target_label': target_raw,
        'reason': (e.meta or {}).get('reason', ''),
        'ip': e.ip or '',
    }


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    qparams = dict(params or {})
    action_filter = (qparams.get('action') or '').strip().lower()
    actor_filter = (qparams.get('actor') or '').strip().lower()

    qs = BeautyAdminAuditEvent.objects.all()
    if action_filter:
        qs = qs.filter(action__icontains=action_filter)
    if actor_filter:
        qs = qs.filter(Q(actor_email__icontains=actor_filter))

    total = qs.count()
    rows = [_row(e) for e in qs.order_by('-created_at')[:_PAGE_SIZE]]

    # Distinct action codes for filter chip rendering.
    action_values = list(
        BeautyAdminAuditEvent.objects.values_list('action', flat=True)
        .distinct().order_by('action')
    )

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_audit',
        'data': {
            'rows': rows,
            'total': total,
            'page_size': _PAGE_SIZE,
            'filters': {'action': action_filter, 'actor': actor_filter},
            'action_values': action_values,
            'admin_email': user.get('email') or '',
            'tab_badges': h.admin_tab_badges(),
            'notif_count': h.admin_notif_count(),
            'session_remaining': h.session_remaining_label(cookie, device_id),
            'admin_initials': h.admin_initials(user),
        },
        'meta': {'title': 'Beauty — Audit log'},
        '_links': {
            'self':     h.self_link('beauty_admin_portal_audit'),
            'home':     h.screen_link('home',     'beauty_admin_portal_dashboard'),
            'crm':      h.screen_link('crm',      'beauty_admin_portal_crm'),
            'bookings': h.screen_link('bookings', 'beauty_admin_portal_bookings'),
            'tickets':  h.screen_link('tickets',  'beauty_admin_portal_tickets'),
            'team':     h.screen_link('team',     'beauty_admin_portal_team'),
        },
    }
