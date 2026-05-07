"""Beauty Business Profile Resolver

Financial dashboard for the signed-in business provider. Shows the
total dollars customers have paid out (lifetime), this-month, and
this-year, plus the booking count behind those numbers.
"""

from datetime import datetime, timezone

from beauty_api.availability_service import ensure_storefront
from beauty_api.models import BeautyBooking

from ..services import hateoas_service as h
from ..services.application_gate import (
    redirect_to_wizard_if_incomplete,
    resolve_business_or_redirect,
)
from ..services.price_format_service import cents_to_dollars


def _earnings(storefront) -> dict:
    qs = BeautyBooking.objects.filter(
        service__provider=storefront,
        status__in=(BeautyBooking.STATUS_BOOKED, BeautyBooking.STATUS_COMPLETED),
    )
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    year_start = datetime(now.year, 1, 1, tzinfo=timezone.utc)

    total = month = year = 0
    paid_count = 0
    for b in qs:
        cents = b.display_price_cents or 0
        total += cents
        paid_count += 1
        if b.slot_at >= month_start:
            month += cents
        if b.slot_at >= year_start:
            year += cents
    return {
        'currency': 'USD',
        'total_cents': total,
        'this_month_cents': month,
        'this_year_cents': year,
        'total_dollars': cents_to_dollars(total),
        'this_month_dollars': cents_to_dollars(month),
        'this_year_dollars': cents_to_dollars(year),
        'paid_bookings_count': paid_count,
    }


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    business, app, redirect = resolve_business_or_redirect(request, device_id)
    if redirect is not None:
        return redirect
    gate = redirect_to_wizard_if_incomplete(app)
    if gate is not None:
        return gate

    storefront = ensure_storefront(business)
    earnings = _earnings(storefront)

    return {
        'action': 'render',
        'screen': 'beauty_business_profile',
        'data': {
            'business': {
                'email': business.email,
                'business_name': business.business_name,
            },
            'earnings': earnings,
        },
        'meta': {'title': 'Profile · Earnings'},
        '_links': {
            'self': h.self_link('beauty_business_profile'),
            'business_home': h.screen_link(
                'business_home', 'beauty_business_home', prompt='Dashboard',
            ),
            'settings': h.screen_link(
                'settings', 'beauty_business_settings', prompt='Settings',
            ),
        },
    }
