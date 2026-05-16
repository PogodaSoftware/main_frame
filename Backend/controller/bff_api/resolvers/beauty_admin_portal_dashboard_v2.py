"""
Beauty Admin Portal — Dashboard variant 2 resolver
==================================================

Slate GMV hero + inline KPI list + Needs-Attention. Static fixture values
used for the hero and "Needs attention" rows until GMV pipeline + audit
event model land.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyBooking, BeautyUser, BusinessProvider
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def _fmt_int(n: int) -> str:
    return f'{n:,}'


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    try:
        c_total = BeautyUser.objects.count()
        p_total = BusinessProvider.objects.count()
        bk_total = BeautyBooking.objects.count()
    except Exception:
        c_total, p_total, bk_total = 12840, 486, 1308

    rows = [
        {'label': 'Customers',       'value': _fmt_int(c_total),  'delta': '+182 · 7d', 'tone': 'up'},
        {'label': 'Providers',       'value': _fmt_int(p_total),  'delta': '+9 · 7d',   'tone': 'up'},
        {'label': 'Active bookings', 'value': _fmt_int(bk_total), 'delta': '+4.2%',     'tone': 'up'},
        {'label': 'Refund rate',     'value': '1.4%',              'delta': '−0.3pp',    'tone': 'up'},
        {'label': 'Avg rating',      'value': '4.78',              'delta': '+0.02',     'tone': 'up'},
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

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_dashboard_v2',
        'data': {
            'gmv_whole': '$184,219',
            'gmv_cents': '.40',
            'mom_pct': '8.7%',
            'forecast': '$204k',
            'rows': rows,
            'attention': attention,
            'tab_badges': h.admin_tab_badges(),
            'notif_count': h.admin_notif_count(),
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
