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
from ..services import hateoas_service as h
from ..services.auth_service import get_authenticated_user


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


def _fmt_money(cents: int) -> str:
    """Render cents as compact dollars: '$184k', '$42.1k', '$985'."""
    dollars = (cents or 0) / 100.0
    if dollars >= 1_000_000:
        return f'${dollars / 1_000_000:.1f}m'.replace('.0m', 'm')
    if dollars >= 10_000:
        return f'${dollars / 1000:.0f}k'
    if dollars >= 1_000:
        return f'${dollars / 1000:.1f}k'
    return f'${dollars:,.0f}'


def _pct_delta(curr: int, prev: int) -> str:
    """Signed percent string. Returns 'new' when the prior bucket is empty."""
    if not prev:
        if not curr:
            return '0%'
        return 'new'
    pct = ((curr - prev) / prev) * 100.0
    sign = '+' if pct >= 0 else ''
    return f'{sign}{pct:.1f}%'


def _bookings_series(now, days: int = 7) -> list[int]:
    """Per-day booking counts for the last ``days`` days, oldest → newest."""
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    counts = [0] * days
    qs = BeautyBooking.objects.filter(
        created_at__gte=start,
    ).exclude(status__in=BeautyBooking.CANCELLED_STATUSES).values_list('created_at', flat=True)
    for created in qs:
        idx = (created.date() - start.date()).days
        if 0 <= idx < days:
            counts[idx] += 1
    return counts


def _gmv_series(now, days: int = 7) -> list[int]:
    """Per-day GMV cents (snapshot-aware) for last ``days``, oldest → newest."""
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    cents = [0] * days
    qs = BeautyBooking.objects.filter(
        created_at__gte=start,
    ).exclude(status__in=BeautyBooking.CANCELLED_STATUSES).values_list(
        'created_at', 'service_price_cents_at_booking', 'service__price_cents',
    )
    for created, snap_cents, live_cents in qs:
        idx = (created.date() - start.date()).days
        if 0 <= idx < days:
            cents[idx] += int(snap_cents if snap_cents is not None else (live_cents or 0))
    return cents


def _signups_daily(now, days: int) -> list[int]:
    """Per-day customer signup counts for the last ``days`` days, oldest → newest."""
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    counts = [0] * days
    qs = BeautyUser.objects.filter(created_at__gte=start).values_list('created_at', flat=True)
    for created in qs:
        idx = (created.date() - start.date()).days
        if 0 <= idx < days:
            counts[idx] += 1
    return counts


# Range selector (header "Last N days" + chart chips). Maps a range key to a
# day window for the signups trend chart.
_RANGE_DAYS = {'7d': 7, '30d': 30, '90d': 90}


def _signups_weekly(now, weeks: int = 12) -> list[int]:
    """Per-week customer signup counts for last ``weeks`` weeks, oldest → newest."""
    week_start = (now - timedelta(days=7 * (weeks - 1))).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = week_start - timedelta(days=week_start.weekday())
    counts = [0] * weeks
    qs = BeautyUser.objects.filter(created_at__gte=week_start).values_list('created_at', flat=True)
    for created in qs:
        delta_weeks = ((created.date() - week_start.date()).days) // 7
        if 0 <= delta_weeks < weeks:
            counts[delta_weeks] += 1
    return counts


def _flagged_count() -> int:
    """Accounts needing manual review: business-cancelled bookings as proxy."""
    return BeautyBooking.objects.filter(
        status=BeautyBooking.STATUS_CANCELLED_BY_BUSINESS,
    ).count()


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    try:
        c = _counts()
    except Exception:
        c = {
            'customers_total': 0, 'providers_total': 0,
            'customers_7d': 0, 'providers_7d': 0, 'bookings_mo': 0,
        }

    now = datetime.now(timezone.utc)
    first_name = (user.get('email') or 'admin').split('@', 1)[0].split('.', 1)[0].title()

    # Trend-chart range: header "Last N days" dropdown + chart chips.
    rng = (params or {}).get('range') or '7d'
    if rng not in _RANGE_DAYS:
        rng = '7d'
    trend_days = _RANGE_DAYS[rng]
    range_label = f'Last {trend_days} days'

    # ── Real series + month-over-month deltas, all from DB ──
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_end = month_start - timedelta(seconds=1)
    prev_month_start = prev_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    try:
        bookings_prev_mo = BeautyBooking.objects.filter(
            created_at__gte=prev_month_start, created_at__lt=month_start,
        ).count()
        gmv_mo_cents = sum(
            int(snap if snap is not None else (live or 0))
            for snap, live in BeautyBooking.objects.filter(
                created_at__gte=month_start,
            ).exclude(status__in=BeautyBooking.CANCELLED_STATUSES).values_list(
                'service_price_cents_at_booking', 'service__price_cents',
            )
        )
        gmv_prev_mo_cents = sum(
            int(snap if snap is not None else (live or 0))
            for snap, live in BeautyBooking.objects.filter(
                created_at__gte=prev_month_start, created_at__lt=month_start,
            ).exclude(status__in=BeautyBooking.CANCELLED_STATUSES).values_list(
                'service_price_cents_at_booking', 'service__price_cents',
            )
        )
        bookings_7d_series = _bookings_series(now, 7)
        bookings_prev7_series = _bookings_series(now - timedelta(days=7), 7)
        gmv_7d_series = _gmv_series(now, 7)
        gmv_prev7_series = _gmv_series(now - timedelta(days=7), 7)
        signups_12w_series = _signups_weekly(now, 12)
        trend_series = _signups_daily(now, trend_days)
        flagged = _flagged_count()
    except Exception:
        bookings_prev_mo = 0
        gmv_mo_cents = 0
        gmv_prev_mo_cents = 0
        bookings_7d_series = [0] * 7
        bookings_prev7_series = [0] * 7
        gmv_7d_series = [0] * 7
        gmv_prev7_series = [0] * 7
        signups_12w_series = [0] * 12
        trend_series = [0] * trend_days
        flagged = 0

    bookings_7d_total = sum(bookings_7d_series)
    bookings_prev7_total = sum(bookings_prev7_series)
    gmv_7d_total_cents = sum(gmv_7d_series)
    gmv_prev7_total_cents = sum(gmv_prev7_series)
    signups_12w_total = sum(signups_12w_series)

    kpis = [
        {'label': 'Customers',     'value': _fmt_int(c['customers_total']), 'delta': f"+{c['customers_7d']} · 7d", 'tone': 'up'},
        {'label': 'Providers',     'value': _fmt_int(c['providers_total']), 'delta': f"+{c['providers_7d']} · 7d", 'tone': 'up'},
        {'label': 'Bookings (mo)', 'value': _fmt_int(c['bookings_mo']),     'delta': _pct_delta(c['bookings_mo'], bookings_prev_mo), 'tone': 'up' if c['bookings_mo'] >= bookings_prev_mo else 'down'},
        {'label': 'GMV (mo)',      'value': _fmt_money(gmv_mo_cents),       'delta': _pct_delta(gmv_mo_cents, gmv_prev_mo_cents),     'tone': 'up' if gmv_mo_cents >= gmv_prev_mo_cents else 'down'},
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
            'flagged': flagged,
            'kpis': kpis,
            'quick_links': quick_links,
            'activity': activity,
            'tab_badges': h.admin_tab_badges(),
            'notif_count': h.admin_notif_count(),
            'session_remaining': h.session_remaining_label(
                request.COOKIES.get(SESSION_COOKIE_NAME), device_id,
            ),
            'admin_initials': h.admin_initials(user),
            # Real-data series (replace hardcoded RN client charts).
            'signups_12w_series': signups_12w_series,
            'signups_12w_total': signups_12w_total,
            # Range-driven trend chart (header "Last N days" + chart chips).
            'range': rng,
            'range_options': [
                {'id': '7d', 'label': 'Last 7 days', 'chip': '7D'},
                {'id': '30d', 'label': 'Last 30 days', 'chip': '30D'},
                {'id': '90d', 'label': 'Last 90 days', 'chip': '90D'},
            ],
            'trend_series': trend_series,
            'trend_total': sum(trend_series),
            'trend_label': f'Last {trend_days} days · daily signups',
            'bookings_7d_series': bookings_7d_series,
            'bookings_7d_total': bookings_7d_total,
            'bookings_7d_delta': _pct_delta(bookings_7d_total, bookings_prev7_total),
            'gmv_7d_series_cents': gmv_7d_series,
            'gmv_7d_total': _fmt_money(gmv_7d_total_cents),
            'gmv_7d_delta': _pct_delta(gmv_7d_total_cents, gmv_prev7_total_cents),
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
