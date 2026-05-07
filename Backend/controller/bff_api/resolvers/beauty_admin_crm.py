"""Beauty Admin CRM Resolver

Renders the unified customer + business-provider directory used by the
admin CRM screen. Owns nothing; the React/Angular component owns the
search-bar / tab / pagination state and re-fetches via the link the
resolver hands back.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user:
        return h.redirect_envelope('beauty_login', 'auth_required')
    if not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_home', 'forbidden')

    return {
        'action': 'render',
        'screen': 'beauty_admin_crm',
        'data': {
            'admin_email': user.get('email'),
            # The component fetches the live page from this endpoint with
            # its own search/filter/page params. Keeping the URL on the
            # data envelope means the BFF can rotate it without an app
            # release.
            'list_href': '/api/beauty/admin/crm/',
            'suspend_href': '/api/beauty/admin/crm/suspend/',
        },
        'meta': {'title': 'Beauty — CRM'},
        '_links': {
            'self': h.self_link('beauty_admin_crm'),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
            'flags': h.screen_link('flags', 'beauty_admin_flags', prompt='Feature flags'),
            'list': h.link(
                rel='list',
                href='/api/beauty/admin/crm/',
                method='GET',
                prompt='List',
            ),
            'suspend': h.link(
                rel='suspend',
                href='/api/beauty/admin/crm/suspend/',
                method='POST',
                prompt='Suspend',
            ),
        },
    }
