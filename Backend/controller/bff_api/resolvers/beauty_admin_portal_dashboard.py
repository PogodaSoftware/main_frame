"""
Beauty Admin Portal — Dashboard resolver
========================================

KPI tiles + activity feed. Counts pulled from real models so the dashboard
isn't pure fixture. Activity feed stays mock until `BeautyAdminAuditEvent`
ships.
"""

from datetime import datetime, timedelta, timezone
from html import escape

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import (
    BeautyAdminAuditEvent, BeautyBooking, BeautyUser, BusinessProvider,
)
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


_ACTIVITY_STYLE = {
    'account.suspend':      ('#C0392B', 'suspended'),
    'account.reinstate':    ('#2F7A47', 'reinstated'),
    'account.export':       ('#0F1115', 'exported account data for'),
    'team.invite':          ('#2F7A47', 'invited'),
    'team.invite_consumed': ('#2F7A47', 'accepted invite for'),
    'team.role':            ('#7A5A1F', 'changed role of'),
    'team.revoke':          ('#C0392B', 'revoked admin access for'),
    'tag.create':           ('#7DA8CF', 'created tag'),
    'note.create':          ('#7DA8CF', 'added note to'),
    'message.send':         ('#7DA8CF', 'messaged'),
    'ticket.create':        ('#7DA8CF', 'opened ticket'),
    'ticket.assign':        ('#7DA8CF', 'assigned ticket'),
    'ticket.status':        ('#7DA8CF', 'updated ticket'),
}


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


def _activity_row(e: BeautyAdminAuditEvent) -> dict:
    color, verb = _ACTIVITY_STYLE.get(e.action, ('#6B6F77', e.action))
    actor = escape(e.actor_email or '—')
    target = escape(e.target_label or e.target_id or e.target_type or '')
    title = f'<b>{actor}</b> {verb}' + (f' <b>{target}</b>' if target else '')
    meta_bits = []
    if e.actor_role:
        meta_bits.append(f'ACL: {e.actor_role}')
    if e.ip:
        meta_bits.append(f'IP {e.ip}')
    return {
        'color': color,
        'title': title,
        'meta': ' · '.join(meta_bits) or e.action,
        'time': _humanize_age(e.created_at),
    }


def _counts() -> dict:
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    customers_total = BeautyUser.objects.count()
    providers_total = BusinessProvider.objects.count()
    customers_7d = BeautyUser.objects.filter(created_at__gte=week_ago).count()
    providers_7d = BusinessProvider.objects.filter(created_at__gte=week_ago).count()
    bookings_mo = BeautyBooking.objects.filter(created_at__gte=month_start).count()
    return {
        'customers_total': customers_total,
        'providers_total': providers_total,
        'customers_7d': customers_7d,
        'providers_7d': providers_7d,
        'bookings_mo': bookings_mo,
    }


def _fmt_int(n: int) -> str:
    return f'{n:,}'


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)

    # Gate to admins; bounce non-admins to signin so the existence isn't
    # advertised to authenticated non-admin users.
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    try:
        c = _counts()
    except Exception:
        c = {
            'customers_total': 12840, 'providers_total': 486,
            'customers_7d': 182, 'providers_7d': 9, 'bookings_mo': 3402,
        }

    now = datetime.now(timezone.utc)
    first_name = (user.get('email') or 'admin').split('@', 1)[0].split('.', 1)[0].title()

    kpis = [
        {'label': 'Customers',     'value': _fmt_int(c['customers_total']), 'delta': f"+{c['customers_7d']} · 7d", 'tone': 'up'},
        {'label': 'Providers',     'value': _fmt_int(c['providers_total']), 'delta': f"+{c['providers_7d']} · 7d", 'tone': 'up'},
        {'label': 'Bookings (mo)', 'value': _fmt_int(c['bookings_mo']),     'delta': '+12.4%', 'tone': 'up'},
        {'label': 'GMV (mo)',      'value': '$184k',                         'delta': '+8.7%',  'tone': 'up'},
    ]

    tickets_sig = h.admin_ticket_signals()
    try:
        from beauty_api.models import BeautyAdminPrincipal, BeautyAdminTag
        admin_count = BeautyAdminPrincipal.objects.count()
        owner_count = BeautyAdminPrincipal.objects.filter(role=BeautyAdminPrincipal.ROLE_OWNER).count()
        tag_count = BeautyAdminTag.objects.count()
    except Exception:
        admin_count, owner_count, tag_count = 0, 0, 0

    tickets_sub_bits = []
    if tickets_sig['open']:
        tickets_sub_bits.append(f"{tickets_sig['open']} open")
    if tickets_sig['sla_breach']:
        tickets_sub_bits.append(f"{tickets_sig['sla_breach']} SLA breach{'es' if tickets_sig['sla_breach'] != 1 else ''}")
    team_sub_bits = []
    if admin_count:
        team_sub_bits.append(f"{admin_count} admin{'s' if admin_count != 1 else ''}")
    if owner_count:
        team_sub_bits.append(f"{owner_count} owner{'s' if owner_count != 1 else ''}")

    quick_links = [
        {'color': '#0F1115', 'label': 'Customer & provider CRM',
         'sub': f"{c['customers_total'] + c['providers_total']:,} accounts · search · suspend",
         'screen': 'crm'},
        {'color': '#7DA8CF', 'label': 'All bookings',
         'sub': f"{c['bookings_mo']:,} this month",
         'screen': 'bookings'},
        {'color': '#C0392B', 'label': 'Support tickets',
         'sub': ' · '.join(tickets_sub_bits),
         'badge': tickets_sig['open'] or None,
         'screen': 'tickets'},
        {'color': '#2F7A47', 'label': 'Admin team',
         'sub': ' · '.join(team_sub_bits),
         'screen': 'team'},
        {'color': '#A06B2C', 'label': 'Manage tags',
         'sub': f"{tag_count} tag{'s' if tag_count != 1 else ''} · admin-managed" if tag_count else 'Admin-managed CRM rubric',
         'screen': 'manage_tags'},
    ]

    try:
        recent_events = list(
            BeautyAdminAuditEvent.objects.order_by('-created_at')[:5]
        )
    except Exception:
        recent_events = []
    activity = [_activity_row(e) for e in recent_events]

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_dashboard',
        'data': {
            'today_label': now.strftime('%a, %b %-d') if hasattr(now, 'strftime') else now.strftime('%a, %b %d'),
            'first_name': first_name,
            'new_signups': c['customers_7d'],
            'flagged': 3,
            'kpis': kpis,
            'quick_links': quick_links,
            'activity': activity,
            'tab_badges': h.admin_tab_badges(),
            'notif_count': h.admin_notif_count(),
        },
        'meta': {'title': 'Beauty — Admin dashboard'},
        '_links': {
            'self': h.self_link('beauty_admin_portal_dashboard'),
            'crm':      h.screen_link('crm',      'beauty_admin_portal_crm',     prompt='CRM'),
            'manage_tags': h.screen_link('manage_tags', 'beauty_admin_portal_tag_manager', prompt='Manage tags'),
            'bookings': h.screen_link('bookings', 'beauty_admin_portal_bookings', prompt='Bookings'),
            'tickets':  h.screen_link('tickets',  'beauty_admin_portal_tickets',  prompt='Tickets'),
            'team':     h.screen_link('team',     'beauty_admin_portal_team',     prompt='Team'),
            'view_all': h.screen_link('view_all', 'beauty_admin_portal_audit',    prompt='Audit log'),
        },
    }
