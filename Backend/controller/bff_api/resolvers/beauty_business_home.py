"""
Beauty Business Home Resolver
=============================
Dashboard landing page for an authenticated business provider. Shows
storefront info + headline counts and HATEOAS links to the manage-services,
weekly-availability, and incoming-bookings sub-screens.

Auth required — non-business users are redirected to the business login.
"""

from datetime import datetime, timezone

from beauty_api.availability_service import ensure_storefront
from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import (
    BeautyBooking,
    BeautyService,
    BusinessProvider,
)
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user:
        return h.redirect_envelope('beauty_business_login', 'auth_required')
    if user.get('user_type') != 'business':
        return h.redirect_envelope('beauty_home', 'wrong_user_type')

    try:
        business = BusinessProvider.objects.get(id=user['user_id'])
    except BusinessProvider.DoesNotExist:
        return h.redirect_envelope('beauty_business_login', 'account_missing')

    storefront = ensure_storefront(business)

    now = datetime.now(timezone.utc)
    bookings_qs = BeautyBooking.objects.filter(service__provider=storefront)
    upcoming_count = bookings_qs.filter(
        status=BeautyBooking.STATUS_BOOKED, slot_at__gt=now,
    ).count()
    services_count = BeautyService.objects.filter(provider=storefront).count()

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
            },
            'storefront': {
                'id': storefront.id,
                'name': storefront.name,
                'short_description': storefront.short_description,
                'location_label': storefront.location_label,
            },
            'stats': {
                'services_count': services_count,
                'upcoming_bookings': upcoming_count,
                'total_bookings': bookings_qs.count(),
            },
        },
        'meta': {'title': 'Business Portal'},
        '_links': links,
    }
