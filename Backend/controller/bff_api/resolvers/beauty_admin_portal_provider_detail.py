"""
Beauty Admin Portal — Business provider detail resolver
"""

from datetime import datetime, timezone
from decimal import Decimal

from django.db.models import Avg, Count, Sum

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import (
    BeautyAdminNote, BeautyBooking, BeautyProvider,
    BeautyProviderAvailability, BeautyReview, BeautyService, BeautySession,
    BusinessProvider,
)
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


_DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']


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


def _services_for(provider_id: int):
    rows = []
    qs = BeautyService.objects.filter(provider_id=provider_id).order_by('category', 'name')[:25]
    for s in qs:
        price = s.price_dollars if s.price_dollars is not None else Decimal(s.price_cents or 0) / 100
        rows.append({
            'id': s.id,
            'name': s.name,
            'duration': f'{s.duration_minutes}m',
            'price': f'${price:.2f}',
            'category': (s.category or '').lower(),
        })
    return rows


def _weekly_hours_for(provider_id: int):
    rows = []
    avail_by_dow = {
        a.day_of_week: a for a in BeautyProviderAvailability.objects.filter(provider_id=provider_id)
    }
    for i, label in enumerate(_DOW_LABELS):
        a = avail_by_dow.get(i)
        if a is None or not a.is_open:
            rows.append({'day': label, 'hours': 'Closed', 'closed': True})
        else:
            rows.append({
                'day': label,
                'hours': f'{a.open_time.strftime("%I:%M %p").lstrip("0")} – {a.close_time.strftime("%I:%M %p").lstrip("0")}',
                'closed': False,
            })
    return rows


def _review_buckets(provider_id: int):
    """Aggregate review star distribution for the provider's services."""
    qs = BeautyReview.objects.filter(service__provider_id=provider_id)
    total = qs.count()
    if total == 0:
        return total, '—', []
    buckets_raw = dict(qs.values_list('rating').annotate(count=Count('id')).values_list('rating', 'count'))
    buckets = []
    for stars in (5, 4, 3, 2, 1):
        c = buckets_raw.get(stars, 0)
        buckets.append({'stars': stars, 'pct': round((c / total) * 100)})
    avg = qs.aggregate(a=Avg('rating'))['a'] or 0
    return total, f'{avg:.2f}', buckets


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

    bp = BusinessProvider.objects.filter(id=target_id).first()
    if bp is None:
        return h.redirect_envelope('beauty_admin_portal_crm', 'not_found')

    profile = BeautyProvider.objects.filter(business_provider_id=bp.id).first()
    provider_profile_id = profile.id if profile else None

    # Performance aggregates
    earned = Decimal('0')
    bookings_total = 0
    cancel_rate_pct = '—'
    avg_rating_str = '—'
    if provider_profile_id is not None:
        bk_agg = BeautyBooking.objects.filter(service__provider_id=provider_profile_id).aggregate(
            earned=Sum('service_price_dollars_at_booking'),
            total=Count('id'),
            cancelled=Count('id', filter=~_q_active_status()),
        ) if False else None  # placeholder — rebuild simpler block below

    if provider_profile_id is not None:
        bk_qs = BeautyBooking.objects.filter(service__provider_id=provider_profile_id)
        bookings_total = bk_qs.count()
        earned = bk_qs.aggregate(s=Sum('service_price_dollars_at_booking'))['s'] or Decimal('0')
        cancelled = bk_qs.filter(status__in=BeautyBooking.CANCELLED_STATUSES).count()
        if bookings_total > 0:
            cancel_rate_pct = f'{(cancelled / bookings_total) * 100:.0f}%'

        reviews_count, avg_rating_str, review_buckets = _review_buckets(provider_profile_id)
    else:
        reviews_count, avg_rating_str, review_buckets = 0, '—', []

    performance = [
        {'value': f'${earned:,.0f}',     'label': 'Earned'},
        {'value': str(bookings_total),    'label': 'Bookings'},
        {'value': avg_rating_str + ('★' if avg_rating_str != '—' else ''), 'label': 'Rating'},
        {'value': cancel_rate_pct,         'label': 'Cancel rate'},
    ]

    services = _services_for(provider_profile_id) if provider_profile_id is not None else []
    weekly_hours = _weekly_hours_for(provider_profile_id) if provider_profile_id is not None else []

    # Last seen (active provider session)
    last_session = (
        BeautySession.objects
        .filter(user_type=BeautySession.USER_TYPE_BUSINESS, user_id=bp.id)
        .order_by('-created_at')
        .first()
    )

    has_active_booking = False
    if provider_profile_id is not None:
        has_active_booking = (
            BeautyBooking.objects
            .filter(service__provider_id=provider_profile_id)
            .exclude(status__in=BeautyBooking.CANCELLED_STATUSES)
            .exists()
        )

    notes_qs = BeautyAdminNote.objects.filter(target_type='business', target_id=bp.id).order_by('-created_at')[:25]

    risk_score = 12 + (30 if bp.is_suspended else 0)
    risk_label = 'Low' if risk_score < 30 else 'Watch' if risk_score < 70 else 'High'

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_provider_detail',
        'data': {
            'id': bp.id,
            'business_name': bp.business_name or bp.email,
            'email': bp.email,
            'phone': bp.contact_phone or '—',
            'joined_label': _humanize_dt(bp.created_at),
            'last_seen_label': _humanize_relative(last_session.created_at) if last_session else '—',
            'is_suspended': bp.is_suspended,
            'verified': bool(profile and bp.business_name),
            'has_active_booking': has_active_booking,
            'performance': performance,
            'services': services,
            'payouts': [],
            'weekly_hours': weekly_hours,
            'avg_rating': avg_rating_str,
            'reviews_count': reviews_count,
            'review_buckets': review_buckets,
            'internal_notes': [
                {
                    'author': n.author_email.split('@', 1)[0].replace('.', ' ').title() if n.author_email else 'Admin',
                    'when': _humanize_relative(n.created_at),
                    'text': n.body,
                    'you': (n.author_user_id == user.get('user_id') and n.author_user_type == (user.get('user_type') or '')),
                }
                for n in notes_qs
            ],
            'risk_score': risk_score,
            'risk_label': risk_label,
            'tab_badges': h.admin_tab_badges(),
            'notif_count': h.admin_notif_count(),
        },
        'meta': {'title': f'Beauty — {bp.business_name or bp.email}'},
        '_links': {
            'self': h.self_link('beauty_admin_portal_provider_detail', params={'id': bp.id}),
            'back': h.screen_link('back', 'beauty_admin_portal_crm', prompt='Providers'),
            'manage_tags': h.screen_link('manage_tags', 'beauty_admin_portal_tag_manager'),
            'note': h.link(
                rel='note', href=f'/api/beauty/admin/portal/business/{bp.id}/note/',
                method='POST', screen='beauty_admin_portal_provider_detail',
                route=h.SCREEN_ROUTES['beauty_admin_portal_provider_detail'].replace(':id', str(bp.id)),
                prompt='Add note',
            ),
            'message': h.link(
                rel='message', href=f'/api/beauty/admin/portal/business/{bp.id}/message/',
                method='POST', screen='beauty_admin_portal_provider_detail',
                route=h.SCREEN_ROUTES['beauty_admin_portal_provider_detail'].replace(':id', str(bp.id)),
                prompt='In-app msg',
            ),
            'export': h.link(
                rel='export', href=f'/api/beauty/admin/portal/business/{bp.id}/export/',
                method='GET', screen=None, route=None, prompt='Export',
            ),
            'suspend': h.link(
                rel='suspend', href=None, method='NAV',
                screen='beauty_admin_portal_suspend',
                route=h.SCREEN_ROUTES['beauty_admin_portal_suspend']
                    .replace(':type', 'business').replace(':id', str(bp.id)),
                params={'type': 'business', 'id': bp.id},
                prompt='Suspend / Reinstate',
            ),
        },
    }


def _q_active_status():
    # Helper kept for future fine-grained aggregate query if needed.
    from django.db.models import Q
    return Q(status__in=BeautyBooking.CANCELLED_STATUSES)
