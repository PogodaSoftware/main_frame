"""
Beauty Business Home Resolver
=============================
Landing page of the onboarded business provider's portal.

Returns the calendar window + earnings & bookings/clients gauges that
the dashboard component renders, plus HATEOAS links to the manage-
services, weekly-availability, and incoming-bookings sub-screens.

Auth required — non-business users are redirected to the customer home;
unauthenticated users go to the business login. Providers who haven't
finished the 5-step application are redirected to the wizard.
"""

from datetime import datetime, timedelta, timezone

from beauty_api.availability_service import ensure_storefront
from beauty_api.models import BeautyBooking
from ..services import hateoas_service as h
from ..services.business_gate import require_onboarded_business


def _aggregate_overview(storefront, now: datetime) -> dict:
    """Mirror the data shape of `BusinessDashboardOverviewView` so the
    resolver and the REST endpoint stay in lockstep. The resolver
    inlines this so a single BFF round-trip carries everything the
    dashboard needs."""
    window_start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    window_end = (now + timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)

    bookings = list(
        BeautyBooking.objects.select_related('service', 'customer')
        .filter(
            service__provider=storefront,
            slot_at__gte=window_start,
            slot_at__lt=window_end,
        )
        .exclude(status=BeautyBooking.STATUS_CANCELLED_IMMEDIATE)
        .order_by('slot_at')
    )

    calendar_events = [
        {
            'id': b.id,
            'slot_at': b.slot_at.isoformat(),
            'duration_minutes': b.display_duration_minutes,
            'status': b.status,
            'service_name': b.display_service_name,
            'customer_email': b.customer.email,
            'price_cents': b.display_price_cents,
        }
        for b in bookings
    ]

    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month = (month_start + timedelta(days=32)).replace(day=1)
    earnings_cents = 0
    monthly_qs = BeautyBooking.objects.filter(
        service__provider=storefront,
        slot_at__gte=month_start,
        slot_at__lt=next_month,
    ).exclude(status=BeautyBooking.STATUS_CANCELLED_IMMEDIATE)
    for b in monthly_qs:
        earnings_cents += b.display_price_cents

    earnings_target_cents = 500_000

    # Bookings & clients gauge: count distinct customers who've ever booked,
    # split into "new" (first booking < 30 days ago) and "recurring" so the
    # caption can read like "12 new · 8 recurring · 5 upcoming".
    customer_first_seen: dict[int, datetime] = {}
    customer_count: dict[int, int] = {}
    for b in BeautyBooking.objects.filter(service__provider=storefront).exclude(
        status=BeautyBooking.STATUS_CANCELLED_IMMEDIATE,
    ):
        cid = b.customer_id
        if cid not in customer_first_seen or b.slot_at < customer_first_seen[cid]:
            customer_first_seen[cid] = b.slot_at
        customer_count[cid] = customer_count.get(cid, 0) + 1

    new_clients = sum(
        1
        for cid, first_seen in customer_first_seen.items()
        if (now - first_seen) < timedelta(days=30) and customer_count[cid] == 1
    )
    recurring_clients = sum(1 for c in customer_count.values() if c >= 2)
    unique_clients = len(customer_first_seen)
    clients_target = 50

    upcoming_count = sum(
        1 for b in bookings
        if b.status == BeautyBooking.STATUS_BOOKED and b.slot_at > now
    )

    return {
        'storefront': {
            'id': storefront.id,
            'name': storefront.name,
            'short_description': storefront.short_description,
            'location_label': storefront.location_label,
        },
        'calendar': {
            'window_start': window_start.isoformat(),
            'window_end': window_end.isoformat(),
            'events': calendar_events,
        },
        'gauges': {
            'earnings': {
                'label': 'Monthly earnings',
                'value_cents': earnings_cents,
                'target_cents': earnings_target_cents,
                'percent': min(
                    100, int(round(earnings_cents * 100 / max(earnings_target_cents, 1))),
                ),
                'caption': f'${earnings_cents/100:,.0f} of ${earnings_target_cents/100:,.0f}',
            },
            'clients': {
                'label': 'Bookings & clients',
                'value': unique_clients,
                'target': clients_target,
                'percent': min(
                    100, int(round(unique_clients * 100 / max(clients_target, 1))),
                ),
                'caption': f'{new_clients} new · {recurring_clients} recurring · {upcoming_count} upcoming',
                'breakdown': {
                    'new': new_clients,
                    'recurring': recurring_clients,
                    'upcoming': upcoming_count,
                    'total': unique_clients,
                },
            },
        },
    }


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    business, redirect = require_onboarded_business(request, device_id)
    if redirect:
        return redirect

    storefront = ensure_storefront(business)
    overview = _aggregate_overview(storefront, datetime.now(timezone.utc))

    links = {
        'self': h.self_link('beauty_business_home'),
        'home': h.screen_link('home', 'beauty_home', prompt='Beauty'),
        'services': h.screen_link(
            'services', 'beauty_business_services', prompt='Manage services',
        ),
        'availability': h.screen_link(
            'availability', 'beauty_business_availability', prompt='Edit hours',
        ),
        'bookings': h.screen_link(
            'bookings', 'beauty_business_bookings', prompt='View bookings',
        ),
        'logout': h.link(
            rel='logout',
            href='/api/beauty/business/logout/',
            method='POST',
            screen='beauty_home',
            route=h.SCREEN_ROUTES['beauty_home'],
            prompt='Sign out',
        ),
    }

    return {
        'action': 'render',
        'screen': 'beauty_business_home',
        'data': {
            'business': {
                'email': business.email,
                'business_name': business.business_name,
                'first_name': business.first_name,
                'last_name': business.last_name,
            },
            **overview,
        },
        'meta': {'title': 'Business Portal'},
        '_links': links,
    }
