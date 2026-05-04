"""
Beauty Business Bookings Resolver
=================================
Read-only list of all bookings on the signed-in provider's storefront,
split into Upcoming and Past for display.

Auth required — non-business users are redirected to the business login.
"""

from datetime import datetime, timezone

from beauty_api.availability_service import ensure_storefront
from beauty_api.models import BeautyBooking
from ..services import hateoas_service as h
from ..services.application_gate import (
    redirect_to_wizard_if_incomplete,
    resolve_business_or_redirect,
)


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    business, app, redirect = resolve_business_or_redirect(request, device_id)
    if redirect is not None:
        return redirect
    gate = redirect_to_wizard_if_incomplete(app)
    if gate is not None:
        return gate

    storefront = ensure_storefront(business)
    bookings = (
        BeautyBooking.objects.select_related('service', 'customer')
        .filter(service__provider=storefront)
        .order_by('-slot_at')
    )

    now = datetime.now(timezone.utc)
    upcoming = []
    past = []
    for b in bookings:
        item = {
            'id': b.id,
            'status': b.status,
            'slot_at': b.slot_at.isoformat(),
            'slot_label': b.slot_at.strftime('%a %b %-d · %-I:%M %p UTC'),
            'service': {
                'id': b.service.id,
                'name': b.service.name,
                'duration_minutes': b.service.duration_minutes,
                'price_cents': b.service.price_cents,
            },
            'customer_email': b.customer.email,
        }
        if b.status == BeautyBooking.STATUS_BOOKED and b.slot_at > now:
            upcoming.append(item)
        else:
            past.append(item)

    return {
        'action': 'render',
        'screen': 'beauty_business_bookings',
        'data': {
            'storefront': {'id': storefront.id, 'name': storefront.name},
            'upcoming': upcoming,
            'past': past,
            'total': len(upcoming) + len(past),
        },
        'meta': {'title': 'Incoming bookings'},
        '_links': {
            'self': h.self_link('beauty_business_bookings'),
            'business_home': h.screen_link(
                'business_home', 'beauty_business_home', prompt='Dashboard',
            ),
            'services': h.screen_link(
                'services', 'beauty_business_services', prompt='Manage services',
            ),
            'availability': h.screen_link(
                'availability', 'beauty_business_availability', prompt='Edit hours',
            ),
        },
    }
