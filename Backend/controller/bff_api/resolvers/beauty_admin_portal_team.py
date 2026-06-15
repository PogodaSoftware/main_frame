"""
Beauty Admin Portal — Admin team management resolver
====================================================

Lists admin principals with their role + last-active. Surfaces a static
4-role × 13-permission matrix (read-only here; owners can edit elsewhere)
plus a "+ Invite" composer the frontend renders inline.
"""

import re
from datetime import datetime, timezone

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import (
    BeautyAdminInvite, BeautyAdminPrincipal, BeautyUser, BusinessProvider,
)
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


_ROLE_OPTIONS = [
    {'value': 'owner',         'label': 'Owner',         'color': '#C0392B', 'bg': '#FCE8E5'},
    {'value': 'support_lead',  'label': 'Support lead',  'color': '#7A5A1F', 'bg': '#F1E8DA'},
    {'value': 'risk_analyst',  'label': 'Risk analyst',  'color': '#2F7A47', 'bg': '#E5F3EA'},
    {'value': 'support_agent', 'label': 'Support agent', 'color': '#6B6F77', 'bg': '#E9E9EB'},
]

# Static matrix mirrors admin-misc.jsx lines 431–445. Values:
#   Y = allowed, A = with second-admin approval, n = denied.
_PERMISSION_ROWS = [
    ('View CRM',                  'Y', 'Y', 'Y', 'Y'),
    ('Edit account / tags',       'Y', 'Y', 'Y', 'n'),
    ('Suspend account',           'Y', 'Y', 'A', 'n'),
    ('Refund booking',            'Y', 'Y', 'n', 'n'),
    ('Issue payout adjustment',   'Y', 'n', 'n', 'n'),
    ('Verify provider docs',      'Y', 'Y', 'Y', 'n'),
    ('Message via Email / SMS',   'Y', 'Y', 'Y', 'Y'),
    ('Send in-app message',       'Y', 'Y', 'Y', 'Y'),
    ('Assign / close tickets',    'Y', 'Y', 'n', 'Y'),
    ('Invite admins',             'Y', 'n', 'n', 'n'),
    ('Edit role permissions',     'Y', 'n', 'n', 'n'),
    ('Export account data (PII)', 'Y', 'Y', 'n', 'n'),
    ('View audit log',            'Y', 'Y', 'Y', 'Y'),
]


def _humanize_age(dt) -> str:
    if not dt:
        return '—'
    s = int((datetime.now(timezone.utc) - dt).total_seconds())
    if s < 60:
        return 'now'
    if s < 3600:
        return f'{s // 60}m'
    if s < 86400:
        return f'{s // 3600}h'
    return f'{s // 86400}d'


def _initials(name: str, email: str) -> str:
    src = (name or '').strip()
    if src:
        parts = [p for p in src.split() if p]
        if len(parts) >= 2:
            return (parts[0][:1] + parts[-1][:1]).upper()
        init = src[:2].upper()
        return (init * 2)[:2] if init else 'AA'
    if email:
        local = email.split('@', 1)[0]
        bits = re.split(r'[._-]', local)
        bits = [b for b in bits if b]
        if len(bits) >= 2:
            return (bits[0][:1] + bits[1][:1]).upper()
        init = local[:2].upper()
        return (init * 2)[:2] if init else 'AA'
    return 'AA'


def _principal_email_and_name(p: BeautyAdminPrincipal) -> tuple[str, str]:
    if p.user_type == 'customer':
        u = BeautyUser.objects.filter(id=p.user_id).only('email').first()
        if u:
            return u.email, p.display_name or u.email.split('@', 1)[0].replace('.', ' ').title()
    elif p.user_type == 'business':
        b = BusinessProvider.objects.filter(id=p.user_id).only('email', 'business_name').first()
        if b:
            return b.email, p.display_name or b.business_name or b.email
    return '', p.display_name or '—'


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    # Current admin's role drives whether mutation buttons are surfaced.
    me = BeautyAdminPrincipal.objects.filter(
        user_type=user.get('user_type') or '',
        user_id=user.get('user_id'),
    ).only('id', 'role').first()
    is_owner = bool(me and me.role == 'owner')

    role_meta = {opt['value']: opt for opt in _ROLE_OPTIONS}

    admins = []
    for p in BeautyAdminPrincipal.objects.order_by('-role', 'id'):
        email, name = _principal_email_and_name(p)
        admins.append({
            'principal_id': p.id,
            'user_type': p.user_type,
            'user_id': p.user_id,
            'name': name,
            'email': email,
            'role': p.role,
            'role_label': role_meta.get(p.role, {}).get('label', p.role),
            'role_color': role_meta.get(p.role, {}).get('color', '#6B6F77'),
            'role_bg':    role_meta.get(p.role, {}).get('bg',    '#E9E9EB'),
            'last_active': _humanize_age(p.last_active_at),
            'status': 'Active',
            'initials': _initials(name, email),
            'is_me': bool(me and me.id == p.id),
        })

    pending_invites = (
        BeautyAdminInvite.objects
        .filter(consumed_at__isnull=True, expires_at__gt=datetime.now(timezone.utc))
        .order_by('-created_at')
    )
    invites = []
    for inv in pending_invites:
        invites.append({
            'id': inv.id,
            'email': inv.email,
            'role': inv.role,
            'role_label': role_meta.get(inv.role, {}).get('label', inv.role),
            'expires_at': inv.expires_at.isoformat(),
        })

    owners_count = sum(1 for a in admins if a['role'] == 'owner')

    permission_matrix = {
        'role_order': [opt['value'] for opt in _ROLE_OPTIONS],
        'role_labels': [opt['label'].split(' ')[0] for opt in _ROLE_OPTIONS],
        'role_colors': [opt['color'] for opt in _ROLE_OPTIONS],
        'rows': [
            {'label': label, 'values': list(vals)}
            for (label, *vals) in _PERMISSION_ROWS
        ],
    }

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_team',
        'data': {
            'admins': admins,
            'invites': invites,
            'totals': {
                'admins': len(admins),
                'owners': owners_count,
                'pending_invites': len(invites),
            },
            'role_options': _ROLE_OPTIONS,
            'permission_matrix': permission_matrix,
            'admin_email': user.get('email') or '',
            'is_owner': is_owner,
            'tab_badges': h.admin_tab_badges(),
            'notif_count': h.admin_notif_count(),
            'session_remaining': h.session_remaining_label(cookie, device_id),
            'admin_initials': h.admin_initials(user),
        },
        'meta': {'title': 'Beauty — Admin team'},
        '_links': {
            'self':     h.self_link('beauty_admin_portal_team'),
            'home':     h.screen_link('home',     'beauty_admin_portal_dashboard'),
            'crm':      h.screen_link('crm',      'beauty_admin_portal_crm'),
            'bookings': h.screen_link('bookings', 'beauty_admin_portal_bookings'),
            'tickets':  h.screen_link('tickets',  'beauty_admin_portal_tickets'),
            'audit':    h.screen_link('audit',    'beauty_admin_portal_audit'),
            'invite': h.link(
                rel='invite', href='/api/beauty/admin/portal/team/invite/', method='POST',
                screen='beauty_admin_portal_team',
                route=h.SCREEN_ROUTES['beauty_admin_portal_team'],
                prompt='Send invite',
            ),
            'role_template': h.link(
                rel='role', href='/api/beauty/admin/portal/team/:id/role/', method='PATCH',
                screen='beauty_admin_portal_team',
                route=h.SCREEN_ROUTES['beauty_admin_portal_team'],
                prompt='Change role',
            ),
            'revoke_template': h.link(
                rel='revoke', href='/api/beauty/admin/portal/team/:id/', method='DELETE',
                screen='beauty_admin_portal_team',
                route=h.SCREEN_ROUTES['beauty_admin_portal_team'],
                prompt='Revoke admin',
            ),
        },
    }
