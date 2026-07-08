"""Beauty Business Notifications resolver.

Lazy-fetched when the provider taps the topbar bell. Real-data feed — no
fabricated signals:

  - unread chat messages      (per active booking, business is the viewer)
  - new bookings              (created in the last 7 days, still upcoming)
  - customer cancellations    (cancelled_by_customer in the last 7 days)

`unread` = items the provider hasn't actioned yet (any unread message;
bookings/cancellations from the last 24h). The topbar shows that as the
bell badge and lists the items in a dropdown.
"""

from datetime import datetime, timedelta, timezone

from beauty_api import chat_service
from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyBooking, BeautyProvider

from ..services import hateoas_service as h
from ..services.auth_service import get_authenticated_user


def _age(dt, now) -> str:
    if not dt:
        return ''
    s = int((now - dt).total_seconds())
    if s < 60:
        return 'now'
    if s < 3600:
        return f'{s // 60}m'
    if s < 86400:
        return f'{s // 3600}h'
    return f'{s // 86400}d'


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or user.get('user_type') != 'business':
        return h.redirect_envelope('beauty_business_login', 'auth_required')

    user_id = user.get('user_id')
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    day_ago = now - timedelta(days=1)

    provider_ids = list(
        BeautyProvider.objects.filter(business_provider_id=user_id).values_list('id', flat=True)
    )
    bookings = list(
        BeautyBooking.objects
        .select_related('service', 'customer')
        .filter(service__provider_id__in=provider_ids)
        .order_by('-created_at')
    )

    staged: list[tuple] = []  # (sort_dt, item)

    # ── Unread chat messages ──
    for b in bookings:
        if b.status in BeautyBooking.CANCELLED_STATUSES:
            continue
        try:
            unread = chat_service.unread_count_for(b, viewer_type='business', viewer_id=user_id)
        except Exception:
            unread = 0
        if unread > 0:
            last = chat_service.last_message_at(b) if hasattr(chat_service, 'last_message_at') else None
            sort_dt = last or b.slot_at
            staged.append((sort_dt, {
                'kind': 'message',
                'title': f"{unread} new message{'s' if unread != 1 else ''}",
                'sub': f"{b.customer.email} · {b.display_service_name}",
                'time': _age(sort_dt, now),
                'unread': True,
                'screen': 'beauty_business_messages',
            }))

    # ── New bookings (recently created, still upcoming) ──
    for b in bookings:
        if b.status != BeautyBooking.STATUS_BOOKED:
            continue
        if b.created_at and b.created_at >= week_ago:
            staged.append((b.created_at, {
                'kind': 'booking',
                'title': 'New booking',
                'sub': f"{b.display_service_name} · {b.customer.email}",
                'time': _age(b.created_at, now),
                'unread': b.created_at >= day_ago,
                'screen': 'beauty_business_bookings',
            }))

    # ── Customer cancellations (recent) ──
    for b in bookings:
        if b.status != BeautyBooking.STATUS_CANCELLED_BY_CUSTOMER:
            continue
        if b.created_at and b.created_at >= week_ago:
            staged.append((b.created_at, {
                'kind': 'cancel',
                'title': 'Booking cancelled',
                'sub': f"{b.customer.email} cancelled {b.display_service_name}",
                'time': _age(b.created_at, now),
                'unread': b.created_at >= day_ago,
                'screen': 'beauty_business_bookings',
            }))

    staged.sort(key=lambda t: t[0] or now, reverse=True)
    items = [it for _dt, it in staged][:20]
    unread = sum(1 for it in items if it.get('unread'))

    return {
        'action': 'render',
        'screen': 'beauty_business_notifications',
        'data': {
            'notifications': items,
            'unread': unread,
            'unread_count': unread,
            'total': len(items),
        },
        'meta': {'title': 'Notifications'},
        '_links': {
            'self': h.self_link('beauty_business_notifications'),
            'messages': h.screen_link('messages', 'beauty_business_messages', prompt='Messages'),
            'bookings': h.screen_link('bookings', 'beauty_business_bookings', prompt='Bookings'),
        },
    }
