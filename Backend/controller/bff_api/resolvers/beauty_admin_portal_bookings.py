"""
Beauty Admin Portal — Bookings ledger resolver
"""

from datetime import datetime, timezone
from decimal import Decimal

from django.db.models import Q, Sum

from beauty_api.models import BeautyBooking
from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services import hateoas_service as h
from ..services.auth_service import get_authenticated_user


_MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
_DOW = ['MON','TUE','WED','THU','FRI','SAT','SUN']

_REFUND_STATUSES = (BeautyBooking.STATUS_CANCELLED_BY_BUSINESS, BeautyBooking.STATUS_CANCELLED_IMMEDIATE)


def _confirmation(pk: int) -> str:
    hex_id = format(pk, 'x').upper().rjust(8, '0')
    return f'BK-{hex_id[:4]}-{hex_id[4:]}'


def _status_chip(status: str) -> str:
    if status in _REFUND_STATUSES:
        return 'Refunded'
    if status in BeautyBooking.CANCELLED_STATUSES:
        return 'Cancelled'
    return 'Confirmed'


def _row(b: BeautyBooking) -> dict:
    customer_name = b.customer.email.split('@', 1)[0].replace('.', ' ').title()
    provider_name = ''
    try:
        provider_name = b.service.provider.name if b.service and b.service.provider else ''
    except Exception:
        provider_name = ''
    price = b.service_price_dollars_at_booking
    return {
        'id': b.id,
        'confirmation': _confirmation(b.id),
        'mon': _MON[b.slot_at.month - 1],
        'day': b.slot_at.day,
        'weekday': _DOW[b.slot_at.weekday()],
        'time': b.slot_at.strftime('%I:%M %p').lstrip('0') if hasattr(b.slot_at, 'strftime') else '',
        'service': b.service_name_at_booking or (b.service.name if b.service else '—'),
        'customer_name': customer_name,
        'provider_name': provider_name or '—',
        'price': f'${price:,.2f}' if price is not None else '—',
        'status': _status_chip(b.status),
    }


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    qparams = dict(params or {})
    active_status = (qparams.get('status') or 'all').lower()
    q = (qparams.get('q') or '').strip()
    sort = (qparams.get('sort') or 'newest').lower()

    from datetime import timedelta
    now = datetime.now(timezone.utc)
    pending_cutoff = now - timedelta(hours=24)
    base = BeautyBooking.objects.select_related('customer', 'service__provider')

    # Status buckets (counts always reflect base — not q — so user sees full
    # distribution while searching).
    bucket_qs = BeautyBooking.objects
    upcoming_count = bucket_qs.filter(slot_at__gte=now).exclude(status__in=BeautyBooking.CANCELLED_STATUSES).count()
    past_count = bucket_qs.filter(slot_at__lt=now).exclude(status__in=BeautyBooking.CANCELLED_STATUSES).count()
    cancelled_count = bucket_qs.filter(status__in=BeautyBooking.CANCELLED_STATUSES).count()
    refunded_count = bucket_qs.filter(status__in=_REFUND_STATUSES).count()
    # Pending = newly-booked (created in last 24h) + slot still in future +
    # not yet cancelled. Real DB query — no fake placeholder.
    pending_count = bucket_qs.filter(
        status=BeautyBooking.STATUS_BOOKED,
        slot_at__gte=now,
        created_at__gte=pending_cutoff,
    ).count()
    total_count = bucket_qs.count()

    status_buckets = [
        {'id': 'All',       'count': total_count},
        {'id': 'Upcoming',  'count': upcoming_count},
        {'id': 'Pending',   'count': pending_count},
        {'id': 'Past',      'count': past_count},
        {'id': 'Cancelled', 'count': cancelled_count},
        {'id': 'Refunded',  'count': refunded_count},
    ]

    qs = base
    if active_status == 'upcoming':
        qs = qs.filter(slot_at__gte=now).exclude(status__in=BeautyBooking.CANCELLED_STATUSES)
    elif active_status == 'past':
        qs = qs.filter(slot_at__lt=now).exclude(status__in=BeautyBooking.CANCELLED_STATUSES)
    elif active_status == 'cancelled':
        qs = qs.filter(status__in=BeautyBooking.CANCELLED_STATUSES)
    elif active_status == 'refunded':
        qs = qs.filter(status__in=_REFUND_STATUSES)
    elif active_status == 'pending':
        qs = qs.filter(
            status=BeautyBooking.STATUS_BOOKED,
            slot_at__gte=now,
            created_at__gte=pending_cutoff,
        )

    if q:
        try:
            q_int = int(q)
        except ValueError:
            q_int = None
        f = Q(customer__email__icontains=q) | Q(service_name_at_booking__icontains=q) | Q(service__provider__name__icontains=q)
        if q_int is not None:
            f = f | Q(id=q_int)
        # Confirmation code lookup: strip BK- prefix + hyphen, reparse hex
        clean = q.replace('-', '').replace('BK', '').replace('bk', '')
        try:
            hex_id = int(clean, 16)
            f = f | Q(id=hex_id)
        except (ValueError, TypeError):
            pass
        qs = qs.filter(f)

    sort_map = {
        'newest':       '-slot_at',
        'oldest':        'slot_at',
        'price_desc':   '-service_price_dollars_at_booking',
        'price_asc':     'service_price_dollars_at_booking',
        'customer':      'customer__email',
        'provider':      'service__provider__name',
        'created':      '-created_at',
    }
    order_field = sort_map.get(sort, '-slot_at')
    qs = qs.order_by(order_field)[:50]
    rows = [_row(b) for b in qs]

    # Summary stats (always full-month aggregates, not filter-narrowed).
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    this_month_count = BeautyBooking.objects.filter(slot_at__gte=month_start).count()
    gmv_total = BeautyBooking.objects.filter(slot_at__gte=month_start).aggregate(s=Sum('service_price_dollars_at_booking'))['s'] or Decimal('0')
    refund_rate = (refunded_count / total_count * 100) if total_count else 0

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_bookings',
        'data': {
            'rows': rows,
            'status_buckets': status_buckets,
            'active_status': active_status.title() if active_status != 'all' else 'All',
            'filtered_total': len(rows) if (q or active_status != 'all') else total_count,
            'q': q,
            'sort': sort,
            'sort_options': [
                {'value': 'newest',     'label': 'Newest first'},
                {'value': 'oldest',     'label': 'Oldest first'},
                {'value': 'price_desc', 'label': 'Price (high → low)'},
                {'value': 'price_asc',  'label': 'Price (low → high)'},
                {'value': 'customer',   'label': 'Customer A → Z'},
                {'value': 'provider',   'label': 'Provider A → Z'},
                {'value': 'created',    'label': 'Recently created'},
            ],
            'this_month_count': this_month_count,
            'gmv_label': f'${gmv_total:,.0f}',
            'refund_rate_pct': f'{refund_rate:.1f}%',
            'tab_badges': h.admin_tab_badges(),
            'notif_count': h.admin_notif_count(),
            'session_remaining': h.session_remaining_label(cookie, device_id),
            'admin_initials': h.admin_initials(user),
        },
        'meta': {'title': 'Beauty — Bookings ledger'},
        '_links': {
            'self':            h.self_link('beauty_admin_portal_bookings'),
            'home':            h.screen_link('home',     'beauty_admin_portal_dashboard'),
            'crm':             h.screen_link('crm',      'beauty_admin_portal_crm'),
            'tickets':         h.screen_link('tickets',  'beauty_admin_portal_tickets'),
            'team':            h.screen_link('team',     'beauty_admin_portal_team'),
            # Admin booking detail — stays inside the admin portal. Never link
            # to the customer/business `beauty_booking_detail` screen.
            'booking_detail':  h.screen_link('booking_detail', 'beauty_admin_portal_booking_detail',
                                             prompt='Open booking'),
        },
    }
