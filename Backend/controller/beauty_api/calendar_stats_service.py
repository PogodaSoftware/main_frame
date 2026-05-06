"""Calendar Stats Service
=========================
Pure computation of the month-bucketed booking calendar + earnings /
volume / new-vs-recurring gauges for a business storefront.

Shared by the REST view (``BusinessCalendarStatsView``) and the BFF
``beauty_business_home`` resolver — same numbers, one source of truth.
"""

from datetime import datetime, timezone

from .models import BeautyBooking, BeautyProvider


DEFAULT_MONTHLY_TARGET_CENTS = 500_000


def compute_month_payload(
    storefront: BeautyProvider,
    *,
    year: int | None = None,
    month: int | None = None,
) -> dict:
    """Return ``{month, today, month_bookings, stats}`` for the given month.

    Dates default to the current UTC month.
    """
    now = datetime.now(timezone.utc)
    y = int(year) if year else now.year
    m = int(month) if month else now.month
    if not (1 <= m <= 12):
        raise ValueError('month must be 1..12')

    start = datetime(y, m, 1, tzinfo=timezone.utc)
    next_y, next_m = (y, m + 1) if m < 12 else (y + 1, 1)
    end = datetime(next_y, next_m, 1, tzinfo=timezone.utc)

    bookings_qs = (
        BeautyBooking.objects.select_related('service', 'customer')
        .filter(service__provider=storefront)
        .exclude(status=BeautyBooking.STATUS_CANCELLED_IMMEDIATE)
    )
    in_month = list(bookings_qs.filter(slot_at__gte=start, slot_at__lt=end).order_by('slot_at'))

    month_bookings: dict = {}
    earnings_cents = 0
    bookings_count = 0
    by_category: dict = {}
    customers_in_month: set = set()

    for b in in_month:
        day_key = b.slot_at.strftime('%Y-%m-%d')
        month_bookings.setdefault(day_key, []).append({
            'id': b.id,
            'customer_email': b.customer.email,
            'service_name': b.display_service_name,
            'slot_at': b.slot_at.isoformat(),
            'status': b.status,
            'price_cents': b.display_price_cents,
            'duration_minutes': b.display_duration_minutes,
        })
        if b.status in (BeautyBooking.STATUS_BOOKED, BeautyBooking.STATUS_COMPLETED):
            earnings_cents += b.display_price_cents or 0
        if b.status not in BeautyBooking.CANCELLED_STATUSES:
            bookings_count += 1
            cat = b.service.category if b.service_id else 'other'
            by_category[cat] = by_category.get(cat, 0) + 1
            customers_in_month.add(b.customer_id)

    new_clients = 0
    recurring_clients = 0
    for cust_id in customers_in_month:
        total = bookings_qs.filter(customer_id=cust_id).count()
        if total >= 2:
            recurring_clients += 1
        else:
            new_clients += 1

    return {
        'month': f'{y:04d}-{m:02d}',
        'today': now.strftime('%Y-%m-%d'),
        'month_bookings': month_bookings,
        'stats': {
            'earnings_cents': earnings_cents,
            'earnings_target_cents': DEFAULT_MONTHLY_TARGET_CENTS,
            'bookings_count': bookings_count,
            'by_category': by_category,
            'new_clients': new_clients,
            'recurring_clients': recurring_clients,
        },
    }
