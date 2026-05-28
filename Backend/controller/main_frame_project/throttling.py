import ipaddress

from rest_framework.throttling import AnonRateThrottle

_LOCALHOST_ADDRS = frozenset(['127.0.0.1', '::1', 'localhost'])

# Docker default bridge gateways (Compose creates 172.16.0.0/12 networks)
# and the loopback aliases the Android emulator surfaces as when it routes
# through ``10.0.2.2`` → host. Treating these as "same machine" so dev
# emulator traffic isn't penalized by the prod-shaped anon throttle.
_DEV_EXEMPT_CIDRS = (
    ipaddress.ip_network('172.16.0.0/12'),    # docker bridge networks
    ipaddress.ip_network('192.168.0.0/16'),   # WSL2 / LAN dev hosts
    ipaddress.ip_network('10.0.0.0/8'),       # vpn / lan
)


def _is_dev_local(remote_addr: str) -> bool:
    if remote_addr in _LOCALHOST_ADDRS:
        return True
    try:
        ip = ipaddress.ip_address(remote_addr)
    except ValueError:
        return False
    return any(ip in cidr for cidr in _DEV_EXEMPT_CIDRS)


class LocalhostExemptAnonRateThrottle(AnonRateThrottle):
    """
    Identical to AnonRateThrottle but skips throttling for requests
    originating from the developer's machine — localhost, the docker bridge
    gateway the emulator NATs through, or the local LAN.

    This allows automated tests running on the same machine as the
    development server to make as many requests as needed without
    hitting the per-minute rate cap, while production traffic from
    external IPs continues to be rate-limited normally.
    """

    def allow_request(self, request, view):
        if _is_dev_local(request.META.get('REMOTE_ADDR', '')):
            return True
        return super().allow_request(request, view)
