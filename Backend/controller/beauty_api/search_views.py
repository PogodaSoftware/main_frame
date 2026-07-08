"""
Beauty Service Search
=====================
Customer-facing infinite-scroll search across active and future beauty
services. Single endpoint with offset-based cursor pagination, keyword
match against name + description + tags (CharField subset), location
filter, and a token-bucket rate limiter to absorb rapid keystrokes
from misbehaving clients.

Endpoint:
    GET /api/beauty/services/search/
        ?q=<keyword>
        &location=<city or postal>
        &offset=<int>
        &limit=<int, default 20, max 50>
        &includeFuture=true|false   (default true)

Auth:
    Requires the same signed cookie as the rest of the customer
    catalog (see ``booking_views._require_authenticated``). Rate
    limiting buckets by client IP regardless of session.

Rate-limit policy (per IP):
    Token bucket — capacity 20, refill 10 tokens / second. Each
    request costs 1 token. When empty we return 429 with a
    ``Retry-After`` header (seconds until next token). Bucket state
    is held in the Django cache; if the cache is unreachable the
    limiter fails-open (returns 200) so a degraded cache never
    blocks search.
"""

from __future__ import annotations

import math
import time

from django.core.cache import cache
from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth_security import client_ip
from .availability_service import marketplace_visibility_q
from .booking_views import _require_authenticated, _provider_to_dict
from .models import BeautyFavorite, BeautyService, BeautySession


SEARCH_DEFAULT_LIMIT = 20
SEARCH_MAX_LIMIT = 50
SEARCH_BUCKET_CAPACITY = 20
SEARCH_BUCKET_REFILL_PER_SEC = 10.0


def _bucket_key(ip: str) -> str:
    return f'beauty_search_bucket:{ip or "unknown"}'


def _consume_token(ip: str) -> tuple[bool, float]:
    """Token-bucket check. Returns ``(allowed, retry_after_seconds)``.

    Fails-open if the cache backend is unavailable: an unreachable
    cache must not break search for legitimate users.
    """
    key = _bucket_key(ip)
    now = time.monotonic()
    try:
        state = cache.get(key)
    except Exception:
        return True, 0.0

    if not state:
        tokens = float(SEARCH_BUCKET_CAPACITY) - 1.0
        cache.set(key, {'tokens': tokens, 'ts': now}, timeout=60)
        return True, 0.0

    elapsed = max(0.0, now - float(state.get('ts', now)))
    refilled = float(state.get('tokens', 0.0)) + elapsed * SEARCH_BUCKET_REFILL_PER_SEC
    tokens = min(float(SEARCH_BUCKET_CAPACITY), refilled)

    if tokens < 1.0:
        retry_after = max(1.0, math.ceil((1.0 - tokens) / SEARCH_BUCKET_REFILL_PER_SEC))
        cache.set(key, {'tokens': tokens, 'ts': now}, timeout=60)
        return False, retry_after

    tokens -= 1.0
    cache.set(key, {'tokens': tokens, 'ts': now}, timeout=60)
    return True, 0.0


def _coerce_int(value, default: int, *, minimum: int = 0, maximum: int | None = None) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    if n < minimum:
        return minimum
    if maximum is not None and n > maximum:
        return maximum
    return n


def _bool_param(value, default: bool) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in {'1', 'true', 'yes', 'on'}


def _service_payload(svc: BeautyService, *, favorited_ids: set | None = None) -> dict:
    return {
        'id': svc.id,
        'name': svc.name,
        'description': svc.description,
        'price_cents': svc.price_cents,
        'duration_minutes': svc.duration_minutes,
        'category': svc.category,
        'is_future': bool(svc.is_future),
        'service_locations': list(svc.service_locations or []),
        'distance_km': getattr(svc, '_distance_km', None),
        'is_favorited': bool(favorited_ids and svc.id in favorited_ids),
        'provider': _provider_to_dict(svc.provider),
    }


def _proximity_distance(svc: BeautyService, location: str) -> int:
    """Coarse proximity score used for ordering when no lat/lng exists.

    0   exact-match service tagged only with this location
    5   service tagged with this location (among others)
    50  service has no explicit locations (treated as "global")
    100 service is tagged elsewhere; provider name still matched the location
    """
    locs = list(svc.service_locations or [])
    if not location:
        return 0
    if locs == [location]:
        return 0
    if location in locs:
        return 5
    if not locs:
        return 50
    if location.lower() in (svc.provider.location_label or '').lower():
        return 75
    return 100


class ServiceSearchView(APIView):
    """GET /api/beauty/services/search/ — infinite-scroll service search."""

    def get(self, request):
        err = _require_authenticated(request)
        if err:
            return err

        ip = client_ip(request) or request.META.get('REMOTE_ADDR', '')
        allowed, retry_after = _consume_token(ip)
        if not allowed:
            resp = Response(
                {'detail': 'Too many search requests. Please slow down.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
            resp['Retry-After'] = str(int(retry_after))
            return resp

        q = (request.GET.get('q') or '').strip()
        location = (request.GET.get('location') or '').strip()
        offset = _coerce_int(request.GET.get('offset'), 0, minimum=0)
        limit = _coerce_int(
            request.GET.get('limit'),
            SEARCH_DEFAULT_LIMIT,
            minimum=1,
            maximum=SEARCH_MAX_LIMIT,
        )
        include_future = _bool_param(request.GET.get('includeFuture'), True)

        qs = (
            BeautyService.objects.select_related('provider')
            .filter(marketplace_visibility_q('provider__'))
        )

        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(description__icontains=q)
                | Q(provider__name__icontains=q)
            )

        if not include_future:
            qs = qs.filter(is_future=False)

        if location:
            # Location-aware filter: services whose serviceLocations
            # array includes the requested location, OR services with no
            # explicit locations (treated as "global"). Provider's own
            # location_label also counts as a match for legacy rows that
            # haven't been re-tagged.
            qs = qs.filter(
                Q(service_locations__contains=[location])
                | Q(service_locations=[])
                | Q(provider__location_label__icontains=location)
            )

        qs = qs.order_by('id')

        # Materialize a slightly larger window when ordering by proximity so
        # we can re-sort the page in Python (JSONField __contains expressions
        # vary too much across DB backends to rely on Case/When ordering).
        if location:
            window = list(qs[offset:offset + (limit * 3) + 1])
            for s in window:
                s._distance_km = _proximity_distance(s, location)
            window.sort(key=lambda s: (s._distance_km, s.id))
            page = window[:limit]
            has_more = len(window) > limit
        else:
            window = list(qs[offset:offset + limit + 1])
            has_more = len(window) > limit
            page = window[:limit]
        next_offset = offset + len(page) if has_more else None

        favorited_ids: set[int] = set()
        viewer_user_id = getattr(request, 'beauty_user_id', None)
        viewer_user_type = getattr(request, 'beauty_user_type', None)
        if viewer_user_type == BeautySession.USER_TYPE_CUSTOMER and viewer_user_id and page:
            page_ids = [s.id for s in page]
            favorited_ids = set(
                BeautyFavorite.objects
                .filter(customer_id=viewer_user_id, service_id__in=page_ids)
                .values_list('service_id', flat=True)
            )

        return Response(
            {
                'items': [_service_payload(s, favorited_ids=favorited_ids) for s in page],
                'next_offset': next_offset,
                'has_more': has_more,
                'query': {
                    'q': q,
                    'location': location,
                    'offset': offset,
                    'limit': limit,
                    'includeFuture': include_future,
                },
            },
            status=status.HTTP_200_OK,
        )
