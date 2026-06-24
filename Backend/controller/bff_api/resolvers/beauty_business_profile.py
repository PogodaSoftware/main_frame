"""Beauty Business Profile Resolver

Financial dashboard for the signed-in business provider. Shows the
total dollars customers have paid out (lifetime), this-month, and
this-year, plus the booking count behind those numbers.
"""

from datetime import datetime, timedelta, timezone

from django.db.models import Avg, Count

from beauty_api.availability_service import ensure_storefront
from beauty_api.models import BeautyBooking, BeautyReview, BeautyService

from ..services import hateoas_service as h
from ..services.application_gate import (
    redirect_to_wizard_if_incomplete,
    resolve_business_or_redirect,
)
from ..services.price_format_service import cents_to_dollars
from ._business_shared import CATEGORY_LABELS as _CATEGORY_LABELS, _display_name, _initial


def _reviews(storefront, *, limit: int = 12) -> dict:
    qs = (
        BeautyReview.objects
        .select_related('customer', 'service')
        .filter(service__provider=storefront)
        .order_by('-created_at')
    )
    agg = qs.aggregate(avg=Avg('rating'), count=Count('id'))
    avg = round(float(agg['avg']), 2) if agg['avg'] is not None else None
    count = int(agg['count'] or 0)

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    breakdown = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    new_this_week = 0
    items = []
    for rv in qs:
        breakdown[rv.rating] = breakdown.get(rv.rating, 0) + 1
        if rv.created_at >= week_ago:
            new_this_week += 1
        if len(items) < limit:
            email = rv.customer.email if rv.customer_id else ''
            items.append({
                'id': rv.id,
                'rating': rv.rating,
                'body': rv.body or '',
                'created_at': rv.created_at.isoformat(),
                'customer': {'initial': _initial(email), 'display_name': _display_name(email)},
                'service': {'name': rv.service.name if rv.service_id else ''},
                'business_reply': rv.business_reply or '',
                'business_reply_at': rv.business_reply_at.isoformat() if rv.business_reply_at else None,
                '_links': {
                    'reply': h.link(
                        rel='reply',
                        href=f'/api/beauty/protected/business/reviews/{rv.id}/reply/',
                        method='POST', prompt='Reply',
                    ),
                },
            })
    return {
        'average': avg,
        'count': count,
        'new_this_week': new_this_week,
        'breakdown': [{'stars': s, 'count': breakdown[s]} for s in (5, 4, 3, 2, 1)],
        'items': items,
    }


def _identity(storefront) -> dict:
    # dedupe in Python: .distinct() leaks the model's default ordering column.
    seen, cats = set(), []
    for c in BeautyService.objects.filter(provider=storefront).values_list('category', flat=True):
        if c not in seen:
            seen.add(c)
            cats.append(c)
    return {
        'address': storefront.location_label or '',
        'categories': [_CATEGORY_LABELS.get(c, c.title()) for c in cats],
        'since': storefront.created_at.strftime('%B %Y') if storefront.created_at else '',
    }


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
            'identity': _identity(storefront),
            'earnings': earnings,
            'reviews': _reviews(storefront),
        },
        'meta': {'title': 'Profile'},
        '_links': {
            'self': h.self_link('beauty_business_profile'),
            'business_home': h.screen_link(
                'business_home', 'beauty_business_home', prompt='Dashboard',
            ),
            'settings': h.screen_link(
                'settings', 'beauty_business_settings', prompt='Settings',
            ),
            'reviews': h.screen_link(
                'reviews', 'beauty_business_reviews', prompt='All reviews',
            ),
        },
    }
