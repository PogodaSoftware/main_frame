"""
Beauty Admin Portal — Customer detail resolver
"""

from datetime import datetime, timezone
from decimal import Decimal

from django.db.models import Count, Sum

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyAdminNote, BeautyBooking, BeautySession, BeautyUser
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def _humanize_dt(dt) -> str:
    if not dt:
        return '—'
    return dt.strftime('%b %-d, %Y') if hasattr(dt, 'strftime') else str(dt)


def _humanize_relative(dt) -> str:
    if not dt:
        return '—'
    delta = datetime.now(timezone.utc) - dt
    s = int(delta.total_seconds())
    if s < 60:
        return 'just now'
    if s < 3600:
        return f'{s // 60}m ago'
    if s < 86400:
        return f'{s // 3600}h ago'
    return f'{s // 86400}d ago'


_MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
_WEEKDAY_ABBR = ['MON','TUE','WED','THU','FRI','SAT','SUN']


def _date_parts(dt) -> dict:
    if not dt:
        return {'mon': '—', 'day': 0, 'weekday': '—'}
    return {
        'mon': _MONTH_ABBR[dt.month - 1],
        'day': dt.day,
        'weekday': _WEEKDAY_ABBR[dt.weekday()],
    }


def _status_to_chip(status: str) -> str:
    if status in ('cancelled', 'cancelled_by_customer', 'cancelled_by_business', 'cancelled_immediate'):
        return 'Cancelled'
    if status == 'pending':
        return 'Pending'
    return 'Confirmed'


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    qparams = dict(params or {})
    try:
        target_id = int(qparams.get('id') or 0)
    except (TypeError, ValueError):
        target_id = 0

    target = BeautyUser.objects.filter(id=target_id).first()
    if target is None:
        return h.redirect_envelope('beauty_admin_portal_crm', 'not_found')

    display_name = target.email.split('@', 1)[0].replace('.', ' ').title()

    # Lifetime aggregates
    agg = BeautyBooking.objects.filter(customer_id=target.id).aggregate(
        count=Count('id'),
        spent=Sum('service_price_dollars_at_booking'),
    )
    total_bookings = agg.get('count') or 0
    total_spent = agg.get('spent') or Decimal('0')

    # Last seen — newest active session created_at
    last_session = (
        BeautySession.objects
        .filter(user_type=BeautySession.USER_TYPE_CUSTOMER, user_id=target.id)
        .order_by('-created_at')
        .first()
    )

    # 3 most recent bookings
    bk_rows = []
    bks = (
        BeautyBooking.objects
        .filter(customer_id=target.id)
        .select_related('service__provider')
        .order_by('-slot_at')[:3]
    )
    for b in bks:
        dp = _date_parts(b.slot_at)
        provider_name = ''
        try:
            provider_name = b.service.provider.business_name if b.service and b.service.provider else ''
        except Exception:
            provider_name = ''
        price_val = b.service_price_dollars_at_booking
        bk_rows.append({
            'id': b.id,
            'mon': dp['mon'],
            'day': dp['day'],
            'weekday': dp['weekday'],
            'service': (b.service_name_at_booking or (b.service.name if b.service else '—')),
            'with_name': provider_name or '—',
            'price': f'${price_val:.2f}' if price_val is not None else '—',
            'status': _status_to_chip(b.status),
        })

    # Timeline (last 4 events): recent bookings + signup
    timeline = []
    for b in bks[:3]:
        timeline.append({
            'when': _humanize_relative(b.created_at),
            'color': '#2F7A47',
            'title': f'Booked <b>{b.service_name_at_booking or (b.service.name if b.service else "service")}</b>',
            'meta': f'Booking #{b.id}',
        })
    timeline.append({
        'when': _humanize_relative(target.created_at),
        'color': '#0F1115',
        'title': f'Created account · {target.email}',
        'meta': 'No 3DS challenge',
    })

    # Risk score heuristic: starts at 12, +30 if suspended, +5 per chargeback (placeholder 0).
    risk_score = 12
    if target.is_suspended:
        risk_score += 30
    risk_label = 'Low' if risk_score < 30 else 'Watch' if risk_score < 70 else 'High'

    # Lifetime stats
    avg_rating = '—'  # ratings join skipped for now
    chargebacks = 0
    lifetime_stats = [
        {'value': str(total_bookings),                'label': 'Bookings'},
        {'value': f'${total_spent:,.0f}',             'label': 'Spent'},
        {'value': avg_rating,                          'label': 'Avg rating'},
        {'value': str(chargebacks),                    'label': 'Chargebacks'},
    ]

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_customer_detail',
        'data': {
            'id': target.id,
            'display_name': display_name,
            'email': target.email,
            'phone': '—',
            'joined_label': _humanize_dt(target.created_at),
            'last_seen_label': _humanize_relative(last_session.created_at) if last_session else '—',
            'is_suspended': target.is_suspended,
            'status_tags': [],
            'attached_tags': [],
            'suggested_tags': [
                {'id': 'win-back', 'label': 'Win-back',   'color': '#8A6A1F', 'tone': '#F1E8DA'},
                {'id': 'beta',     'label': 'Beta program','color': '#1F6E7A','tone': '#DCEEF1'},
                {'id': 'press',    'label': 'Press / PR', 'color': '#0F1115', 'tone': '#E9E9EB'},
            ],
            'lifetime_stats': lifetime_stats,
            'bookings': bk_rows,
            'total_bookings': total_bookings,
            'timeline': timeline,
            'payment_methods': [],
            'internal_notes': [
                {
                    'author': n.author_email.split('@', 1)[0].replace('.', ' ').title() if n.author_email else 'Admin',
                    'when': _humanize_relative(n.created_at),
                    'text': n.body,
                    'you': (n.author_user_id == user.get('user_id') and n.author_user_type == (user.get('user_type') or '')),
                }
                for n in BeautyAdminNote.objects.filter(target_type='customer', target_id=target.id).order_by('-created_at')[:25]
            ],
            'has_active_booking': BeautyBooking.objects.filter(customer_id=target.id).exclude(status__in=BeautyBooking.CANCELLED_STATUSES).exists(),
            'risk_score': risk_score,
            'risk_label': risk_label,
            'tab_badges': h.admin_tab_badges(),
            'notif_count': h.admin_notif_count(),
        },
        'meta': {'title': f'Beauty — {display_name}'},
        '_links': {
            'self': h.self_link('beauty_admin_portal_customer_detail', params={'id': target.id}),
            'back': h.screen_link('back', 'beauty_admin_portal_crm', prompt='Customers'),
            'manage_tags': h.screen_link('manage_tags', 'beauty_admin_portal_tag_manager', prompt='Manage tags'),
            'note': h.link(
                rel='note', href=f'/api/beauty/admin/portal/customer/{target.id}/note/',
                method='POST', screen='beauty_admin_portal_customer_detail',
                route=h.SCREEN_ROUTES['beauty_admin_portal_customer_detail'].replace(':id', str(target.id)),
                prompt='Add note',
            ),
            'message': h.link(
                rel='message', href=f'/api/beauty/admin/portal/customer/{target.id}/message/',
                method='POST', screen='beauty_admin_portal_customer_detail',
                route=h.SCREEN_ROUTES['beauty_admin_portal_customer_detail'].replace(':id', str(target.id)),
                prompt='In-app msg',
            ),
            'export': h.link(
                rel='export', href=f'/api/beauty/admin/portal/customer/{target.id}/export/',
                method='GET', screen=None, route=None, prompt='Export',
            ),
            'suspend': h.link(
                rel='suspend', href=None, method='NAV',
                screen='beauty_admin_portal_suspend',
                route=h.SCREEN_ROUTES['beauty_admin_portal_suspend']
                    .replace(':type', 'customer').replace(':id', str(target.id)),
                params={'type': 'customer', 'id': target.id},
                prompt='Suspend / Reinstate',
            ),
        },
    }
