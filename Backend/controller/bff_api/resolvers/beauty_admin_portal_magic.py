"""
Beauty Admin Portal — Magic-link backup resolver
================================================

Visual-only first pass. POST send-link + GET consume-token endpoints will
land with `BeautyAdminMagicLink`.
"""

from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_magic',
        'data': {
            'eyebrow': 'Backup access',
            'title': 'Email me a sign-in link',
            'sub': "We'll send a one-time link to your work email. Link expires in 5 minutes and can only be used once.",
            'resend_in': '00:48',
            'sent_to': 'maria@beauty.io',
        },
        'meta': {'title': 'Beauty — Admin magic-link'},
        '_links': {
            'self': h.self_link('beauty_admin_portal_magic'),
            'send': h.link(
                rel='send',
                href='/api/beauty/admin/portal/magic/send/',
                method='POST',
                screen='beauty_admin_portal_magic',
                route=h.SCREEN_ROUTES.get('beauty_admin_portal_magic'),
                prompt='Send magic link',
            ),
            'back': h.screen_link(
                'back', 'beauty_admin_portal_signin', prompt='Back to sign-in',
            ),
        },
    }
