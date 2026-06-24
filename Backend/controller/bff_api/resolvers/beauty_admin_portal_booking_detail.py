"""
Beauty Admin Portal — Booking detail resolver
=============================================

Admin-only booking drill-down for the bookings ledger. Deliberately
self-contained within the admin surface: every navigable `_link` points at
another admin-portal screen (customer detail / provider detail / back to the
ledger) — never the customer- or business-facing booking screens. Keeps the
admin portal isolated from the marketplace/business apps.
"""

from beauty_api.models import BeautyBooking, BusinessProvider
from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services import hateoas_service as h
from ..services.auth_service import get_authenticated_user
from ._admin_datetime import humanize_dt as _humanize_dt


_MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
_DOW = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
_REFUND_STATUSES = (BeautyBooking.STATUS_CANCELLED_BY_BUSINESS, BeautyBooking.STATUS_CANCELLED_IMMEDIATE)


def _confirmation(pk: int) -> str:
    hex_id = format(pk, 'x').upper().rjust(8, '0')
    return f'BK-{hex_id[:4]}-{hex_id[4:]}'


def _status_chip(status: str) -> str:
    if status in _REFUND_STATUSES:
        return 'Refunded'
    if status in BeautyBooking.CANCELLED_STATUSES:
        return 'Cancelled'
    return 'Confirmed'


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    qparams = dict(params or {})
    try:
        booking_id = int(qparams.get('id') or 0)
    except (TypeError, ValueError):
        booking_id = 0

    b = (
        BeautyBooking.objects
        .select_related('customer', 'service__provider')
        .filter(id=booking_id)
        .first()
    )
    if b is None:
        return h.redirect_envelope('beauty_admin_portal_bookings', 'not_found')

    customer = b.customer
    customer_name = customer.email.split('@', 1)[0].replace('.', ' ').title()
    beauty_provider = b.service.provider if b.service else None
    provider_name = beauty_provider.name if beauty_provider else '—'

    # Admin provider detail keys off BusinessProvider; the booking's catalog
    # provider (BeautyProvider) links to it via business_provider_id.
    business_provider_id = getattr(beauty_provider, 'business_provider_id', None)
    if business_provider_id is None and beauty_provider is not None:
        # Fallback: match by name when the catalog row isn't linked yet.
        bp = BusinessProvider.objects.filter(business_name=beauty_provider.name).first()
        business_provider_id = bp.id if bp else None

    price = b.service_price_dollars_at_booking
    slot = b.slot_at
    duration = getattr(b, 'service_duration_minutes_at_booking', None) or (
        b.service.duration_minutes if b.service else None
    )

    links = {
        'self': h.self_link('beauty_admin_portal_booking_detail', params={'id': b.id}),
        'back': h.screen_link('back', 'beauty_admin_portal_bookings', prompt='Bookings'),
        # Tab-bar navigation — all admin-portal screens (keeps the shell inside admin).
        'home':     h.screen_link('home',     'beauty_admin_portal_dashboard'),
        'crm':      h.screen_link('crm',      'beauty_admin_portal_crm'),
        'bookings': h.screen_link('bookings', 'beauty_admin_portal_bookings'),
        'tickets':  h.screen_link('tickets',  'beauty_admin_portal_tickets'),
        'team':     h.screen_link('team',     'beauty_admin_portal_team'),
        'customer_detail': h.link(
            rel='customer_detail', href=None, method='NAV',
            screen='beauty_admin_portal_customer_detail',
            route=h.SCREEN_ROUTES['beauty_admin_portal_customer_detail'].replace(':id', str(customer.id)),
            params={'id': customer.id},
            prompt='View customer',
        ),
    }
    if business_provider_id is not None:
        links['provider_detail'] = h.link(
            rel='provider_detail', href=None, method='NAV',
            screen='beauty_admin_portal_provider_detail',
            route=h.SCREEN_ROUTES['beauty_admin_portal_provider_detail'].replace(':id', str(business_provider_id)),
            params={'id': business_provider_id},
            prompt='View provider',
        )

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_booking_detail',
        'data': {
            'id': b.id,
            'confirmation': _confirmation(b.id),
            'status': _status_chip(b.status),
            'service': b.service_name_at_booking or (b.service.name if b.service else '—'),
            'date_mon': _MON[slot.month - 1] if slot else '—',
            'date_day': slot.day if slot else 0,
            'date_weekday': _DOW[slot.weekday()] if slot else '—',
            'slot_label': slot.strftime('%b %-d, %Y · %-I:%M %p') if slot else '—',
            'time_label': slot.strftime('%-I:%M %p') if slot else '—',
            'price_label': f'${price:,.2f}' if price is not None else '—',
            'duration_label': f'{duration} min' if duration else '—',
            'booked_on_label': _humanize_dt(b.created_at),
            'customer': {'id': customer.id, 'name': customer_name, 'email': customer.email},
            'provider': {'id': business_provider_id, 'name': provider_name},
            'tab_badges': h.admin_tab_badges(),
            'notif_count': h.admin_notif_count(),
            'session_remaining': h.session_remaining_label(cookie, device_id),
            'admin_initials': h.admin_initials(user),
        },
        'meta': {'title': f'Beauty — {_confirmation(b.id)}'},
        '_links': links,
    }
