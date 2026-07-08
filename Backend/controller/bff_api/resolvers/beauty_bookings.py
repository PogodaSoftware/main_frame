"""
Beauty Bookings Resolver
========================
Shows the signed-in customer's bookings, separated into upcoming vs past.

Sort order
----------
- ``upcoming``: ASC by slot_at — soonest first.
- ``past``: DESC by slot_at — most-recently-completed first.

Cancellation states
-------------------
The legacy ``cancelled`` and the new ``cancelled_by_customer`` /
``cancelled_by_business`` states all surface in the past list with their
own status. The ``cancelled_immediate`` state (grace-period cancel) is
filtered out entirely — it's treated as never-happened.

Auth required — redirects unauthenticated visitors to `beauty_login`.
(The login screen is the visible landing for unauthenticated users; the
`beauty_welcome` route is reserved for the marketing splash that
existing tests assert on.)
"""

from datetime import datetime, timezone

from beauty_api.models import BeautyBooking
from ..services import hateoas_service as h
from ..services.beauty_timezone_service import provider_timezone as _provider_timezone
from ._customer_auth import require_customer_auth


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    user, redirect = require_customer_auth(request, device_id)
    if redirect:
        return redirect

    bookings = (
        BeautyBooking.objects.select_related('service', 'service__provider')
        .filter(customer_id=user['user_id'])
    )

    now = datetime.now(timezone.utc)
    upcoming = []
    past = []
    for b in bookings:
        # Grace-period cancellations are hidden from history entirely.
        if b.status == BeautyBooking.STATUS_CANCELLED_IMMEDIATE:
            continue
        item = {
            'id': b.id,
            'status': b.status,
            'slot_at': b.slot_at.isoformat(),
            'slot_label': b.slot_at.strftime('%a %b %-d · %-I:%M %p UTC'),
            # Render from the service snapshot taken at booking time so a
            # later business edit doesn't rewrite history.
            'service': {
                'id': b.service.id,
                'name': b.display_service_name,
                'price_cents': b.display_price_cents,
                'duration_minutes': b.display_duration_minutes,
            },
            'provider': {
                'id': b.service.provider.id,
                'name': b.service.provider.name,
                'location_label': b.service.provider.location_label,
                'timezone': _provider_timezone(b.service.provider),
            },
        }
        detail_link = h.screen_link(
            'detail', 'beauty_booking_detail',
            prompt='View booking', params={'id': b.id},
        )
        # Re-book link (used by the past list's "Book again" action).
        provider_link = h.screen_link(
            'provider', 'beauty_provider_detail',
            prompt='Book again', params={'id': b.service.provider.id},
        )
        if b.status == BeautyBooking.STATUS_BOOKED and b.slot_at > now:
            in_grace_window = (
                b.grace_period_ends_at is not None
                and now < b.grace_period_ends_at
            )
            item['grace_period_ends_at'] = (
                b.grace_period_ends_at.isoformat() if b.grace_period_ends_at else None
            )
            item['in_grace_window'] = in_grace_window
            row_links = {
                'detail': detail_link,
                'provider': provider_link,
                'reschedule': h.screen_link(
                    'reschedule', 'beauty_reschedule',
                    prompt='Reschedule', params={'bookingId': b.id},
                ),
                'cancel': h.link(
                    'cancel',
                    method='POST',
                    href=f'/api/beauty/protected/bookings/{b.id}/cancel/',
                    prompt='Cancel',
                ),
            }
            if in_grace_window:
                row_links['cancel_grace'] = h.link(
                    'cancel_grace',
                    method='POST',
                    href=f'/api/beauty/protected/bookings/{b.id}/cancel-grace/',
                    prompt='Cancel free',
                )
            item['_links'] = row_links
            upcoming.append(item)
        else:
            item['_links'] = {'detail': detail_link, 'provider': provider_link}
            past.append(item)

    # Upcoming: soonest first. Past: most-recent first.
    upcoming.sort(key=lambda x: x['slot_at'])
    past.sort(key=lambda x: x['slot_at'], reverse=True)

    return {
        'action': 'render',
        'screen': 'beauty_bookings',
        'data': {
            'upcoming': upcoming,
            'past': past,
            'total': len(upcoming) + len(past),
        },
        'meta': {'title': 'My Bookings'},
        '_links': {
            'self': h.self_link('beauty_bookings'),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
            'chats': h.screen_link('chats', 'beauty_chats', prompt='Chat'),
            'profile': h.screen_link('profile', 'beauty_profile', prompt='Profile'),
        },
    }
