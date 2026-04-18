"""
Beauty Admin Flags Resolver
===========================
Returns the list of runtime feature flags so an authenticated admin
user can toggle them. Flag changes take effect on the next BFF resolve
because every resolver re-reads the flag on each call.

Auth-required — redirects to login if no valid session.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyFlagAudit
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def _current_value(key: str, default: bool) -> bool:
    """
    Use the same DB-first / env-fallback resolution the resolvers rely on,
    so the admin screen never disagrees with the value the rest of the
    BFF actually serves (important on partially-migrated environments
    where some flag rows might not exist yet).
    """
    return h._flag(key, default=default)


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)

    if not user:
        return h.redirect_envelope('beauty_login', 'auth_required')

    # Authorisation: only principals whose (user_type, user_id) pair is
    # listed in the BEAUTY_ADMIN_PRINCIPALS env var (e.g.
    # "customer:1,business:7") may see this screen. Authenticated
    # non-admins are bounced back to the home screen with a "forbidden"
    # reason rather than leaking the existence of this surface.
    if not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_home', 'forbidden')

    flags = []
    for spec in h.FEATURE_FLAGS:
        flags.append({
            'key': spec['key'],
            'label': spec['label'],
            'description': spec['description'],
            'enabled': _current_value(spec['key'], spec['default']),
            'toggle': h.link(
                rel='toggle',
                href='/api/beauty/admin/flags/toggle/',
                method='POST',
                screen='beauty_admin_flags',
                route=h.SCREEN_ROUTES['beauty_admin_flags'],
                prompt='Toggle',
            ),
        })

    audit_qs = (
        BeautyFlagAudit.objects.all()
        .order_by('-changed_at')
        .values(
            'flag_key', 'old_value', 'new_value',
            'changed_by_email', 'changed_by_user_type', 'changed_at',
        )[:25]
    )
    audit = [
        {
            'flag_key': a['flag_key'],
            'old_value': a['old_value'],
            'new_value': a['new_value'],
            'changed_by_email': a['changed_by_email'],
            'changed_by_user_type': a['changed_by_user_type'],
            'changed_at': a['changed_at'].isoformat(),
        }
        for a in audit_qs
    ]

    return {
        'action': 'render',
        'screen': 'beauty_admin_flags',
        'data': {
            'flags': flags,
            'audit': audit,
            'admin_email': user['email'],
        },
        'meta': {'title': 'Beauty — Feature Flags'},
        '_links': {
            'self': h.self_link('beauty_admin_flags'),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
        },
    }
