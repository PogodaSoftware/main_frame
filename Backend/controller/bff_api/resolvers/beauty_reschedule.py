"""
Beauty Reschedule Resolver
==========================
Renders the slot picker for an existing upcoming booking and submits the
chosen slot to the reschedule endpoint. Reuses `compute_slots` from the
availability service so the picker shows the same real availability the
initial booking flow uses, with the booking's own current slot excluded
from busy intervals so it doesn't block its own move.

Auth required (customer). Owner-scoped — a customer can only reschedule
their own bookings. Past or non-active bookings short-circuit back to
the booking-detail screen.

`params` must contain `bookingId` (the booking primary key).
"""

from datetime import datetime, timezone

from beauty_api.availability_service import compute_slots
from beauty_api.models import BeautyBooking
from ..services import hateoas_service as h
from ..services.beauty_timezone_service import provider_timezone as _provider_timezone
from ._customer_auth import coerce_int_param, require_customer_auth


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    user, redirect = require_customer_auth(request, device_id)
    if redirect:
        return redirect

    params = params or {}
    raw_id = params.get('bookingId') or params.get('id')
    booking_id, redirect = coerce_int_param(raw_id, 'beauty_bookings', 'invalid_booking')
    if redirect:
        return redirect

    try:
        b = (
            BeautyBooking.objects.select_related('service', 'service__provider')
            .get(id=booking_id, customer_id=user['user_id'])
        )
    except BeautyBooking.DoesNotExist:
        return h.redirect_envelope('beauty_bookings', 'booking_not_found')

    now = datetime.now(timezone.utc)
    if b.status != BeautyBooking.STATUS_BOOKED or b.slot_at <= now:
        # Bounce back to detail; the detail screen will render the right state.
        return h.redirect_envelope(
            'beauty_booking_detail', 'not_reschedulable',
            params={'id': b.id},
        )

    return {
        'action': 'render',
        'screen': 'beauty_reschedule',
        'data': {
            'booking': {
                'id': b.id,
                'current_slot_at': b.slot_at.isoformat(),
                'current_slot_label': b.slot_at.strftime('%A %b %-d · %-I:%M %p UTC'),
            },
            'service': {
                'id': b.service.id,
                'name': b.service.name,
                'duration_minutes': b.service.duration_minutes,
                'price_cents': b.service.price_cents,
            },
            'provider': {
                'id': b.service.provider.id,
                'name': b.service.provider.name,
                'location_label': b.service.provider.location_label,
                'timezone': _provider_timezone(b.service.provider),
            },
            'form': {
                'submit_method': 'POST',
                'submit_href': f'/api/beauty/protected/bookings/{b.id}/reschedule/',
                'success_screen': 'beauty_booking_detail',
                'success_route_template': f'/pogoda/beauty/bookings/{b.id}',
                'fields': [
                    {
                        'name': 'slot_at',
                        'type': 'select',
                        'label': 'Pick a new time',
                        'required': True,
                        'options': compute_slots(
                            b.service, days_ahead=14,
                            exclude_booking_id=b.id,
                        ),
                    },
                ],
                'submit_label': 'Confirm new time',
            },
        },
        'meta': {'title': f'Reschedule — {b.service.name}'},
        '_links': {
            'self': h.self_link('beauty_reschedule', params={'bookingId': b.id}),
            'booking': h.screen_link(
                'booking', 'beauty_booking_detail',
                prompt='Back to booking', params={'id': b.id},
            ),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
        },
    }
