"""
Beauty Business Providers Resolver
====================================
Returns a list of all BusinessProvider records for the admin review screen.
Auth-required — redirects to login if no valid session.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BusinessProvider
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)

    if not user:
        return h.redirect_envelope('beauty_login', 'auth_required')

    qs = (
        BusinessProvider.objects.all()
        .order_by('-created_at')
        .values('id', 'email', 'business_name', 'created_at')
    )

    providers = [
        {
            'id': p['id'],
            'email': p['email'],
            'business_name': p['business_name'],
            'created_at': p['created_at'].isoformat(),
        }
        for p in qs
    ]

    return {
        'action': 'render',
        'screen': 'beauty_business_providers',
        'data': {
            'providers': providers,
            'total': len(providers),
        },
        'meta': {'title': 'Beauty — Business Providers'},
        '_links': {
            'self': h.self_link('beauty_business_providers'),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
        },
    }
