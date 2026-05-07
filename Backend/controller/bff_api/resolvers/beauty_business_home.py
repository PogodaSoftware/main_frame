"""Beauty Business Home Resolver

Authenticated business landing screen. Redirects unsubmitted /
unaccepted applications back into the wizard. Returns the calendar +
gauge payload consumed by ``BeautyBusinessHomeComponent``.
"""

from datetime import datetime, timezone

from beauty_api.availability_service import ensure_storefront
from beauty_api.calendar_stats_service import compute_month_payload

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
    try:
        year = int(request.GET.get('year')) if request.GET.get('year') else None
        month = int(request.GET.get('month')) if request.GET.get('month') else None
    except (TypeError, ValueError):
        year, month = None, None
    payload = compute_month_payload(storefront, year=year, month=month)
    now = datetime.now(timezone.utc)

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
        'settings': h.screen_link(
            'settings', 'beauty_business_settings', prompt='Settings',
        ),
        'chats': h.screen_link(
            'chats', 'beauty_chats', prompt='Chat',
        ),
        'profile': h.screen_link(
            'profile', 'beauty_business_profile', prompt='Profile',
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
            },
            'storefront': {
                'id': storefront.id,
                'name': storefront.name,
            },
            'now': now.isoformat(),
            'today': payload['today'],
            'month': payload['month'],
            'month_bookings': payload['month_bookings'],
            'stats': payload['stats'],
        },
        'meta': {'title': 'Business Portal'},
        '_links': links,
    }
