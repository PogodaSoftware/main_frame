"""
Beauty Business Availability Resolver
=====================================
Renders the weekly business-hours editor for the signed-in provider's
storefront. Always emits exactly 7 rows (Mon..Sun) — the service layer
auto-creates any missing day with a sensible default so the UI never
has to handle partial data.

Auth required — non-business users are redirected to the business login.
"""

from beauty_api.availability_service import ensure_storefront, get_weekly_hours
from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BusinessProvider
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
    weekly = get_weekly_hours(storefront)

    return {
        'action': 'render',
        'screen': 'beauty_business_availability',
        'data': {
            'storefront': {'id': storefront.id, 'name': storefront.name},
            'weekly_hours': weekly,
            'submit_method': 'PUT',
            'submit_href': '/api/beauty/protected/business/availability/',
        },
        'meta': {'title': 'Weekly hours'},
        '_links': {
            'self': h.self_link('beauty_business_availability'),
            'business_home': h.screen_link(
                'business_home', 'beauty_business_home', prompt='Dashboard',
            ),
            'services': h.screen_link(
                'services', 'beauty_business_services', prompt='Manage services',
            ),
            'bookings': h.screen_link(
                'bookings', 'beauty_business_bookings', prompt='View bookings',
            ),
        },
    }
