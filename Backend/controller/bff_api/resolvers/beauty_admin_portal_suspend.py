"""
Beauty Admin Portal — Suspend confirm sheet resolver
====================================================

URL: /pogoda/beauty/admin/portal/crm/suspend/<type>/<id>

Resolves the account name + a default reason. The actual suspend POST goes
to the existing /api/beauty/admin/crm/suspend/ endpoint via the shell.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyUser, BusinessProvider
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


_DEFAULT_REASON = (
    'Repeated policy violations were detected on this account. Please '
    'respond to your account manager to begin review.'
)


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    qparams = dict(params or {})
    kind = (qparams.get('type') or 'customer').lower()
    if kind not in ('customer', 'business'):
        kind = 'customer'
    try:
        target_id = int(qparams.get('id') or 0)
    except (TypeError, ValueError):
        target_id = 0

    name = ''
    is_currently_suspended = False
    if kind == 'customer':
        u = BeautyUser.objects.filter(id=target_id).only('email', 'is_suspended').first()
        if u:
            name = u.email.split('@', 1)[0].replace('.', ' ').title()
            is_currently_suspended = u.is_suspended
    else:
        p = BusinessProvider.objects.filter(id=target_id).only('business_name', 'email', 'is_suspended').first()
        if p:
            name = p.business_name or p.email
            is_currently_suspended = p.is_suspended

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_suspend',
        'data': {
            'kind': kind,
            'id': target_id,
            'name': name or 'this account',
            'default_reason': '' if is_currently_suspended else _DEFAULT_REASON,
            'is_currently_suspended': is_currently_suspended,
        },
        'meta': {'title': 'Beauty — Suspend confirm'},
        '_links': {
            'self': h.self_link('beauty_admin_portal_suspend', params={'type': kind, 'id': target_id}),
            'submit': h.link(
                rel='submit', href='/api/beauty/admin/crm/suspend/', method='POST',
                screen='beauty_admin_portal_crm',
                route=h.SCREEN_ROUTES['beauty_admin_portal_crm'],
                prompt='Suspend',
            ),
            'close': h.screen_link('close', 'beauty_admin_portal_crm', prompt='Cancel'),
        },
    }
