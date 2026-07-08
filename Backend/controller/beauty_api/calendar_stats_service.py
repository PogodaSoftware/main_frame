"""Calendar Stats Service
=========================
Pure computation of the month-bucketed booking calendar + earnings /
volume / new-vs-recurring gauges for a business storefront.

Shared by the REST view (``BusinessCalendarStatsView``) and the BFF
``beauty_business_home`` resolver — same numbers, one source of truth.
"""

from datetime import datetime, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.db.models import Avg, Count

from .timezone_utils import resolve_zoneinfo
from .models import BeautyBooking, BeautyProvider, BeautyReview


DEFAULT_MONTHLY_TARGET_CENTS = 500_000


def _cents_to_dollars_str(c: int) -> str:
    return f"{(Decimal(int(c or 0)) / Decimal(100)).quantize(Decimal('0.01')):.2f}"


def _zone(storefront: BeautyProvider) -> ZoneInfo:
    """Effective storefront zone via the single canonical resolver."""
    return resolve_zoneinfo(storefront)


def compute_month_payload(
    storefront: BeautyProvider,
    *,
    year: int | None = None,
    month: int | None = None,
) -> dict:
    """Return ``{month, today, month_bookings, stats}`` for the given month.

    The calendar/day buckets and "today" use the storefront's local timezone
    so days line up with the provider's wall clock; booking instants stay UTC.
    Defaults to the current month in the storefront's zone.
    """
    tz = _zone(storefront)
    now = datetime.now(timezone.utc)
    now_local = now.astimezone(tz)
    y = int(year) if year else now_local.year
    m = int(month) if month else now_local.month
    if not (1 <= m <= 12):
        raise ValueError('month must be 1..12')

    # Local month boundaries, converted to UTC for the instant filter.
    next_y, next_m = (y, m + 1) if m < 12 else (y + 1, 1)
    start = datetime(y, m, 1, tzinfo=tz).astimezone(timezone.utc)
    end = datetime(next_y, next_m, 1, tzinfo=tz).astimezone(timezone.utc)

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
        day_key = b.slot_at.astimezone(tz).strftime('%Y-%m-%d')
        month_bookings.setdefault(day_key, []).append({
            'id': b.id,
            'customer_email': b.customer.email,
            'service_name': b.display_service_name,
            'slot_at': b.slot_at.isoformat(),
            'status': b.status,
            'price_cents': b.display_price_cents,
            'price_dollars': b.display_price_dollars,
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

    # Rating — real average over this storefront's service reviews.
    review_agg = (
        BeautyReview.objects
        .filter(service__provider=storefront)
        .aggregate(avg=Avg('rating'), count=Count('id'))
    )
    rating = round(float(review_agg['avg']), 2) if review_agg['avg'] is not None else None
    review_count = int(review_agg['count'] or 0)

    # Conversion — booked/completed vs all booking requests this month
    # (cancellations drag it down). Real proxy until storefront-view
    # tracking exists.
    total_requests = len(in_month)
    booked_or_done = sum(
        1 for b in in_month
        if b.status in (BeautyBooking.STATUS_BOOKED, BeautyBooking.STATUS_COMPLETED)
    )
    conversion_pct = round(100 * booked_or_done / total_requests) if total_requests else 0

    return {
        'month': f'{y:04d}-{m:02d}',
        'today': now_local.strftime('%Y-%m-%d'),
        'month_bookings': month_bookings,
        'stats': {
            'earnings_cents': earnings_cents,
            'earnings_target_cents': DEFAULT_MONTHLY_TARGET_CENTS,
            'earnings_dollars': _cents_to_dollars_str(earnings_cents),
            'earnings_target_dollars': _cents_to_dollars_str(DEFAULT_MONTHLY_TARGET_CENTS),
            'bookings_count': bookings_count,
            'by_category': by_category,
            'new_clients': new_clients,
            'recurring_clients': recurring_clients,
            'rating': rating,
            'review_count': review_count,
            'conversion_pct': conversion_pct,
        },
    }
