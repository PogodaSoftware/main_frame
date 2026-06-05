"""
Beauty Admin Portal — Dashboard variant 2 resolver
==================================================

Slate GMV hero + inline KPI list + Needs-Attention. All KPI/series values
pulled from the DB so the page reflects real seeded data, never fixtures.
"""

import calendar
from datetime import datetime, timedelta, timezone

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import (
    BeautyBooking, BeautyReview, BeautyUser, BusinessProvider,
)
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def _fmt_int(n: int) -> str:
    return f'{n:,}'


def _split_money(cents: int) -> tuple[str, str]:
    """Return ('$X,XXX', '.YY') from a cents value."""
    cents = max(0, int(cents or 0))
    whole = cents // 100
    frac = cents % 100
    return f'${whole:,}', f'.{frac:02d}'


def _fmt_money_short(cents: int) -> str:
    dollars = (cents or 0) / 100.0
    if dollars >= 1_000_000:
        return f'${dollars / 1_000_000:.1f}m'
    if dollars >= 10_000:
        return f'${dollars / 1000:.0f}k'
    if dollars >= 1_000:
        return f'${dollars / 1000:.1f}k'
    return f'${dollars:,.0f}'


def _signed_pct(curr: int, prev: int) -> str:
    if not prev:
        if not curr:
            return '0%'
        return 'new'
    pct = ((curr - prev) / prev) * 100.0
    sign = '+' if pct >= 0 else '−'
    return f'{sign}{abs(pct):.1f}%'


def _gmv_cents_in_range(start, end=None) -> int:
    qs = BeautyBooking.objects.filter(created_at__gte=start)
    if end is not None:
        qs = qs.filter(created_at__lt=end)
    qs = qs.exclude(status__in=BeautyBooking.CANCELLED_STATUSES).values_list(
        'service_price_cents_at_booking', 'service__price_cents',
    )
    return sum(int(snap if snap is not None else (live or 0)) for snap, live in qs)


def _gmv_weekly_series(now, weeks: int = 12) -> list[int]:
    start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=7 * (weeks - 1))
    start = start - timedelta(days=start.weekday())
    cents = [0] * weeks
    qs = BeautyBooking.objects.filter(created_at__gte=start).exclude(
        status__in=BeautyBooking.CANCELLED_STATUSES,
    ).values_list('created_at', 'service_price_cents_at_booking', 'service__price_cents')
    for created, snap, live in qs:
        idx = ((created.date() - start.date()).days) // 7
        if 0 <= idx < weeks:
            cents[idx] += int(snap if snap is not None else (live or 0))
    return cents


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_end = month_start - timedelta(seconds=1)
    prev_month_start = prev_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    try:
        c_total = BeautyUser.objects.count()
        p_total = BusinessProvider.objects.count()
        c_7d = BeautyUser.objects.filter(created_at__gte=week_ago).count()
        p_7d = BusinessProvider.objects.filter(created_at__gte=week_ago).count()
        bk_active = BeautyBooking.objects.exclude(
            status__in=BeautyBooking.CANCELLED_STATUSES,
        ).count()
        bk_active_prev = BeautyBooking.objects.filter(
            created_at__lt=week_ago,
        ).exclude(status__in=BeautyBooking.CANCELLED_STATUSES).count()
        bk_total = BeautyBooking.objects.count()
        bk_refunded = BeautyBooking.objects.filter(
            status=BeautyBooking.STATUS_CANCELLED_BY_BUSINESS,
        ).count()
        bk_refunded_prev = BeautyBooking.objects.filter(
            status=BeautyBooking.STATUS_CANCELLED_BY_BUSINESS,
            created_at__lt=week_ago,
        ).count()
        avg_rating_curr = BeautyReview.objects.aggregate(
            avg=__import__('django.db.models', fromlist=['Avg']).Avg('rating'),
        )['avg']
        avg_rating_prev = BeautyReview.objects.filter(
            created_at__lt=week_ago,
        ).aggregate(
            avg=__import__('django.db.models', fromlist=['Avg']).Avg('rating'),
        )['avg']
        gmv_mo_cents = _gmv_cents_in_range(month_start)
        gmv_prev_mo_cents = _gmv_cents_in_range(prev_month_start, month_start)
        gmv_weekly = _gmv_weekly_series(now, 12)
    except Exception:
        c_total = p_total = bk_active = bk_total = bk_refunded = 0
        c_7d = p_7d = bk_active_prev = bk_refunded_prev = 0
        avg_rating_curr = avg_rating_prev = None
        gmv_mo_cents = gmv_prev_mo_cents = 0
        gmv_weekly = [0] * 12

    refund_rate = (bk_refunded / bk_total * 100.0) if bk_total else 0.0
    refund_rate_prev_total = max(0, bk_total - bk_active + bk_active_prev)
    refund_rate_prev = (
        (bk_refunded_prev / refund_rate_prev_total * 100.0) if refund_rate_prev_total else 0.0
    )
    refund_delta_pp = refund_rate - refund_rate_prev
    refund_delta_str = f'{"+" if refund_delta_pp >= 0 else "−"}{abs(refund_delta_pp):.1f}pp'
    refund_tone = 'up' if refund_delta_pp <= 0 else 'down'

    rating_val_str = f'{avg_rating_curr:.2f}' if avg_rating_curr is not None else '—'
    if avg_rating_curr is not None and avg_rating_prev is not None:
        diff = avg_rating_curr - avg_rating_prev
        rating_delta_str = f'{"+" if diff >= 0 else "−"}{abs(diff):.2f}'
        rating_tone = 'up' if diff >= 0 else 'down'
    else:
        rating_delta_str = 'new'
        rating_tone = 'up'

    bk_active_delta_str = _signed_pct(bk_active, bk_active_prev)
    bk_active_tone = 'up' if bk_active >= bk_active_prev else 'down'

    rows = [
        {'label': 'Customers',       'value': _fmt_int(c_total),  'delta': f'+{c_7d} · 7d',  'tone': 'up'},
        {'label': 'Providers',       'value': _fmt_int(p_total),  'delta': f'+{p_7d} · 7d',  'tone': 'up'},
        {'label': 'Active bookings', 'value': _fmt_int(bk_active), 'delta': bk_active_delta_str, 'tone': bk_active_tone},
        {'label': 'Refund rate',     'value': f'{refund_rate:.1f}%', 'delta': refund_delta_str, 'tone': refund_tone},
        {'label': 'Avg rating',      'value': rating_val_str,        'delta': rating_delta_str, 'tone': rating_tone},
    ]

    sig = h.admin_ticket_signals()
    attention = []
    if sig['sla_breach']:
        n = sig['sla_breach']
        attention.append({
            'color': '#C0392B',
            'title': f'{n} SLA breach{"es" if n != 1 else ""} in support',
            'meta': 'Open tickets past their SLA deadline',
            'time': 'now',
        })
    if sig['open']:
        n = sig['open']
        attention.append({
            'color': '#8A6A1F',
            'title': f'{n} open ticket{"s" if n != 1 else ""}',
            'meta': 'Tap Tickets tab to triage',
            'time': 'now',
        })
    if bk_refunded:
        attention.append({
            'color': '#7DA8CF',
            'title': f'{bk_refunded} business-cancelled booking{"s" if bk_refunded != 1 else ""}',
            'meta': 'Customer refunds owed',
            'time': 'now',
        })

    gmv_whole, gmv_cents_part = _split_money(gmv_mo_cents)
    mom_pct = _signed_pct(gmv_mo_cents, gmv_prev_mo_cents).lstrip('+').lstrip('−')

    # Forecast: extrapolate current run-rate to full month.
    days_into_month = max(1, (now - month_start).days + 1)
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    forecast_cents = int(gmv_mo_cents * (days_in_month / days_into_month)) if days_into_month else 0
    forecast = _fmt_money_short(forecast_cents)

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_dashboard_v2',
        'data': {
            'gmv_whole': gmv_whole,
            'gmv_cents': gmv_cents_part,
            'mom_pct': mom_pct,
            'forecast': forecast,
            'rows': rows,
            'attention': attention,
            'tab_badges': h.admin_tab_badges(),
            'notif_count': h.admin_notif_count(),
            'session_remaining': h.session_remaining_label(
                request.COOKIES.get(SESSION_COOKIE_NAME), device_id,
            ),
            'admin_initials': h.admin_initials(user),
            'gmv_weekly_cents': gmv_weekly,
        },
        'meta': {'title': 'Beauty — Admin dashboard (v2)'},
        '_links': {
            'self': h.self_link('beauty_admin_portal_dashboard_v2'),
            'dashboard_v1': h.screen_link('dashboard_v1', 'beauty_admin_portal_dashboard', prompt='V1'),
            'crm':      h.screen_link('crm',      'beauty_admin_portal_crm'),
            'bookings': h.screen_link('bookings', 'beauty_admin_portal_bookings'),
            'tickets':  h.screen_link('tickets',  'beauty_admin_portal_tickets'),
            'team':     h.screen_link('team',     'beauty_admin_portal_team'),
        },
    }
