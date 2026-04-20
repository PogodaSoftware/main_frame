from rest_framework.throttling import AnonRateThrottle

_LOCALHOST_ADDRS = frozenset(['127.0.0.1', '::1', 'localhost'])


class LocalhostExemptAnonRateThrottle(AnonRateThrottle):
    """
    Identical to AnonRateThrottle but skips throttling for requests
    originating from localhost (127.0.0.1 / ::1).

    This allows automated tests running on the same machine as the
    development server to make as many requests as needed without
    hitting the per-minute rate cap, while production traffic from
    external IPs continues to be rate-limited normally.
    """

    def allow_request(self, request, view):
        remote_addr = request.META.get('REMOTE_ADDR', '')
        if remote_addr in _LOCALHOST_ADDRS:
            return True
        return super().allow_request(request, view)
