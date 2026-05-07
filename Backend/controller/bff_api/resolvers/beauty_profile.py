"""
Beauty Profile Resolver
=======================
Displays the signed-in customer's profile (email + member-since), exposes
the My Bookings link, and a HATEOAS `logout` action.

Auth required — redirects unauthenticated visitors to `beauty_login`.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyBooking, BeautySession
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or user.get('user_type') != 'customer':
        return h.redirect_envelope('beauty_login', 'auth_required')

    user_id = user['user_id']
    booking_count = BeautyBooking.objects.filter(customer_id=user_id).count()

    from beauty_api.models import BeautyUser
    member_since = None
    try:
        record = BeautyUser.objects.get(id=user_id)
        member_since = record.created_at.isoformat()
    except BeautyUser.DoesNotExist:
        member_since = None

    return {
        'action': 'render',
        'screen': 'beauty_profile',
        'data': {
            'user': {
                'id': user_id,
                'email': user.get('email'),
                'member_since': member_since,
            },
            'stats': {
                'booking_count': booking_count,
            },
        },
        'meta': {'title': 'My Profile'},
        '_links': {
            'self': h.self_link('beauty_profile'),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
            'bookings': h.screen_link('bookings', 'beauty_bookings', prompt='My Bookings'),
            'chats': h.screen_link('chats', 'beauty_chats', prompt='Chat'),
            'logout': h.link(
                'logout',
                method='POST',
                href='/api/beauty/logout/',
                prompt='Sign out',
            ),
        },
    }
