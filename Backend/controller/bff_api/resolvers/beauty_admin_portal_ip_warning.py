"""
Beauty Admin Portal — IP allowlist mismatch resolver
====================================================

Renders the network-not-allowlisted warning. Once the IP middleware ships,
the request's actual client IP is populated alongside the configured
allowlist CIDRs from `BeautyAdminIpAllowlist`.
"""

from ..services import hateoas_service as h


def _client_ip(request) -> str:
    xff = (request.META.get('HTTP_X_FORWARDED_FOR') or '').strip()
    if xff:
        return xff.split(',')[0].strip()
    return (request.META.get('REMOTE_ADDR') or '').strip() or '73.181.44.218'


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_ip_warning',
        'data': {
            'title': "This network isn't allowlisted",
            'sub': (
                'Admin sign-in is restricted to corporate networks. Connect '
                'through the company VPN, or request a temporary exception '
                'from your security lead.'
            ),
            'your_ip': _client_ip(request),
            'allowlist': '198.51.100.0/24, 203.0.113.0/24',
        },
        'meta': {'title': 'Beauty — Network restricted'},
        '_links': {
            'self': h.self_link('beauty_admin_portal_ip_warning'),
            'vpn': h.link(
                rel='vpn', href=None, method='NAV',
                screen='beauty_admin_portal_signin',
                route=h.SCREEN_ROUTES.get('beauty_admin_portal_signin'),
                prompt='Connect VPN',
            ),
            'exception': h.link(
                rel='exception',
                href='/api/beauty/admin/portal/ip/exception/',
                method='POST',
                screen='beauty_admin_portal_ip_warning',
                route=h.SCREEN_ROUTES.get('beauty_admin_portal_ip_warning'),
                prompt='Request exception',
            ),
        },
    }
