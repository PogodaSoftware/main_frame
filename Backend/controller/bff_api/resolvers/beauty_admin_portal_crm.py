"""
Beauty Admin Portal — CRM list resolver
=======================================

Powers all D1–D7 list variants via query params:
  - type=customers|providers
  - chip=pill|underline
  - bulk=1
  - tag=<id>   (single tag filter; multi-tag support later)

Reads real rows from `BeautyUser` and `BusinessProvider`. Lifetime/meta
columns synthesise sensibly while booking/spend aggregates aren't wired.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from django.db.models import Sum

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyBooking, BeautySession, BeautyUser, BusinessProvider
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


_SPEND_HIGH_DOLLARS = Decimal('100.00')


def _initials(name: str, email: str) -> str:
    src = (name or email or '').strip()
    if '@' in src:
        src = src.split('@', 1)[0]
    parts = [p for p in src.replace('.', ' ').replace('_', ' ').split() if p]
    if not parts:
        return '??'
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[1][0]).upper()


def _humanize_dt(dt) -> str:
    if not dt:
        return '—'
    return dt.strftime('%b %Y')


def _customer_rows(qs, limit: int = 25):
    out = []
    for u in qs.order_by('-created_at')[:limit]:
        out.append({
            'id': u.id,
            'initials': _initials(u.email.split('@', 1)[0], u.email),
            'name': u.email.split('@', 1)[0].replace('.', ' ').title(),
            'email': u.email,
            'status': 'Suspended' if u.is_suspended else 'Active',
            'tags': [],
            'meta1': f'Joined {_humanize_dt(u.created_at)}',
            'meta2': '0 bookings',
            'meta3': 'Last active —',
            'lifetime': '—',
        })
    return out


def _provider_rows(qs, limit: int = 25):
    out = []
    for p in qs.order_by('-created_at')[:limit]:
        out.append({
            'id': p.id,
            'initials': _initials(p.business_name, p.email),
            'name': p.business_name or p.email,
            'email': p.email,
            'status': 'Active',
            'tags': ['Verified'] if p.business_name else [],
            'meta1': f'Since {_humanize_dt(p.created_at)}',
            'meta2': '0 services',
            'meta3': '— · 0 bookings',
            'lifetime': '—',
        })
    return out


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    qparams = dict(params or {})
    type_ = (qparams.get('type') or 'customers').lower()
    if type_ not in ('customers', 'providers'):
        type_ = 'customers'
    chip = (qparams.get('chip') or 'pill').lower()
    if chip not in ('pill', 'underline'):
        chip = 'pill'
    bulk = qparams.get('bulk') == '1'
    active_tag = qparams.get('tag')
    active_status = (qparams.get('status') or 'all').lower()
    q = (qparams.get('q') or '').strip()
    has_bk = qparams.get('has_bk') == '1'
    signup_30d = qparams.get('signup_30d') == '1'
    active_7d = qparams.get('active_7d') == '1'
    spend_high = qparams.get('spend_high') == '1'

    customers_total = BeautyUser.objects.count()
    providers_total = BusinessProvider.objects.count()

    now = datetime.now(timezone.utc)
    cutoff_30d = now - timedelta(days=30)
    cutoff_7d = now - timedelta(days=7)

    if type_ == 'customers':
        qs = BeautyUser.objects.all()
        if active_status == 'active':
            qs = qs.filter(is_suspended=False)
        elif active_status == 'suspended':
            qs = qs.filter(is_suspended=True)
        elif active_status in ('pending', 'flagged', 'deleted'):
            qs = qs.none()
        if q:
            qs = qs.filter(email__icontains=q)
        if has_bk:
            qs = qs.filter(bookings__isnull=False).distinct()
        if signup_30d:
            qs = qs.filter(created_at__gte=cutoff_30d)
        if active_7d:
            active_user_ids = set(
                BeautySession.objects.filter(
                    user_type=BeautySession.USER_TYPE_CUSTOMER,
                    is_active=True,
                    created_at__gte=cutoff_7d,
                ).values_list('user_id', flat=True)
            )
            qs = qs.filter(id__in=active_user_ids)
        if spend_high:
            high_spender_ids = set(
                BeautyBooking.objects
                .values('customer_id')
                .annotate(spent=Sum('service_price_dollars_at_booking'))
                .filter(spent__gte=_SPEND_HIGH_DOLLARS)
                .values_list('customer_id', flat=True)
            )
            qs = qs.filter(id__in=high_spender_ids)
        rows = _customer_rows(qs)
        status_buckets = [
            {'id': 'All',       'count': customers_total},
            {'id': 'Active',    'count': BeautyUser.objects.filter(is_suspended=False).count()},
            {'id': 'Pending',   'count': 0},
            {'id': 'Suspended', 'count': BeautyUser.objects.filter(is_suspended=True).count()},
            {'id': 'Flagged',   'count': 0},
            {'id': 'Deleted',   'count': 0},
        ]
    else:
        from django.db.models import Q
        qs = BusinessProvider.objects.all()
        if active_status == 'active':
            qs = qs.filter(is_suspended=False)
        elif active_status == 'suspended':
            qs = qs.filter(is_suspended=True)
        elif active_status in ('pending', 'flagged', 'deleted'):
            qs = qs.none()
        if q:
            qs = qs.filter(Q(email__icontains=q) | Q(business_name__icontains=q))
        if signup_30d:
            qs = qs.filter(created_at__gte=cutoff_30d)
        if active_7d:
            active_biz_ids = set(
                BeautySession.objects.filter(
                    user_type=BeautySession.USER_TYPE_BUSINESS,
                    is_active=True,
                    created_at__gte=cutoff_7d,
                ).values_list('user_id', flat=True)
            )
            qs = qs.filter(id__in=active_biz_ids)
        # `has_bk` and `spend_high` for providers stay no-op until the
        # BusinessProvider ↔ BeautyProvider ↔ BeautyService ↔ bookings
        # join is wired. Filter is accepted but doesn't narrow rows.
        rows = _provider_rows(qs)
        status_buckets = [
            {'id': 'All',       'count': providers_total},
            {'id': 'Active',    'count': BusinessProvider.objects.filter(is_suspended=False).count()},
            {'id': 'Pending',   'count': 0},
            {'id': 'Suspended', 'count': BusinessProvider.objects.filter(is_suspended=True).count()},
            {'id': 'Flagged',   'count': 0},
            {'id': 'Deleted',   'count': 0},
        ]

    status_label_map = {
        'all': 'All', 'active': 'Active', 'pending': 'Pending',
        'suspended': 'Suspended', 'flagged': 'Flagged', 'deleted': 'Deleted',
    }
    active_status_label = status_label_map.get(active_status, 'All')
    # When extra filters narrow the queryset beyond the status bucket count,
    # show the rows count so the header doesn't claim more results than render.
    bucket_count = next((b['count'] for b in status_buckets if b['id'] == active_status_label), len(rows))
    extra_filters = q or has_bk or signup_30d or active_7d or spend_high
    filtered_total = len(rows) if extra_filters else bucket_count

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_crm',
        'data': {
            'type': type_,
            'chip_style': chip,
            'bulk': bulk,
            'active_tag_ids': [active_tag] if active_tag else [],
            'active_status': active_status_label,
            'q': q,
            'has_bk': has_bk,
            'signup_30d': signup_30d,
            'active_7d': active_7d,
            'spend_high': spend_high,
            'rows': rows,
            'counts': {'customers': customers_total, 'providers': providers_total},
            'status_buckets': status_buckets,
            'filtered_total': filtered_total,
            'tab_badges': h.admin_tab_badges(),
            'notif_count': h.admin_notif_count(),
        },
        'meta': {'title': 'Beauty — Admin CRM'},
        '_links': {
            'self':      h.self_link('beauty_admin_portal_crm'),
            'customers': h.link(rel='customers', method='NAV', screen='beauty_admin_portal_crm',
                                href=None, route=h.SCREEN_ROUTES['beauty_admin_portal_crm'] + '?type=customers',
                                prompt='Customers'),
            'providers': h.link(rel='providers', method='NAV', screen='beauty_admin_portal_crm',
                                href=None, route=h.SCREEN_ROUTES['beauty_admin_portal_crm'] + '?type=providers',
                                prompt='Providers'),
            'manage_tags':      h.screen_link('manage_tags',      'beauty_admin_portal_tag_manager'),
            'suspend':          h.link(rel='suspend', href='/api/beauty/admin/crm/suspend/', method='POST',
                                       screen='beauty_admin_portal_crm',
                                       route=h.SCREEN_ROUTES['beauty_admin_portal_crm'],
                                       prompt='Suspend'),
            'customer_detail':  h.screen_link('customer_detail',  'beauty_admin_portal_customer_detail'),
            'provider_detail':  h.screen_link('provider_detail',  'beauty_admin_portal_provider_detail'),
            'home':     h.screen_link('home',     'beauty_admin_portal_dashboard'),
            'bookings': h.screen_link('bookings', 'beauty_admin_portal_bookings'),
            'tickets':  h.screen_link('tickets',  'beauty_admin_portal_tickets'),
            'team':     h.screen_link('team',     'beauty_admin_portal_team'),
        },
    }
