"""
Beauty Admin CRM Views
======================
Admin-only REST endpoints powering the CRM screen. Two endpoints:

    GET  /api/beauty/admin/crm/         — list customers + business providers
                                          with search, filter, pagination.
    POST /api/beauty/admin/crm/suspend/ — suspend or unsuspend an account.

Authorisation: a request is admin iff its (user_type, user_id) pair is in
``BEAUTY_ADMIN_PRINCIPALS`` (same allowlist used by the feature flags
admin). Suspending an account also invalidates every active session for
that account so the user is signed out across all devices on the next
authenticated request.
"""

from datetime import datetime, timezone

from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from bff_api.services.auth_service import get_authenticated_user
from bff_api.services.hateoas_service import is_beauty_admin

from .middleware import SESSION_COOKIE_NAME
from .models import BeautySession, BeautyUser, BusinessProvider


VALID_TYPES = ('all', 'customer', 'business')
DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 50


def _require_admin(request) -> Response | None:
    device_id = request.headers.get('X-Device-ID', '').strip()
    if not device_id:
        return Response(
            {'detail': 'Device identifier missing.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if user is None:
        return Response(
            {'detail': 'Authentication required.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    if not is_beauty_admin(user):
        return Response(
            {'detail': 'Admin privileges required.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


def _customer_row(u: BeautyUser) -> dict:
    return {
        'id': u.id,
        'type': 'customer',
        'email': u.email,
        'name': '',
        'created_at': u.created_at.isoformat(),
        'is_suspended': bool(u.is_suspended),
        'suspended_at': u.suspended_at.isoformat() if u.suspended_at else None,
    }


def _business_row(b: BusinessProvider) -> dict:
    return {
        'id': b.id,
        'type': 'business',
        'email': b.email,
        'name': b.business_name,
        'created_at': b.created_at.isoformat(),
        'is_suspended': bool(b.is_suspended),
        'suspended_at': b.suspended_at.isoformat() if b.suspended_at else None,
    }


def _clean_int(raw: str | None, default: int, *, lo: int = 1, hi: int = 1_000_000) -> int:
    try:
        v = int(raw) if raw is not None else default
    except (TypeError, ValueError):
        v = default
    return max(lo, min(hi, v))


class CrmListView(APIView):
    """GET /api/beauty/admin/crm/?type=customer|business|all&q=...&page=1&page_size=10"""

    def get(self, request):
        err = _require_admin(request)
        if err:
            return err

        kind = (request.GET.get('type') or 'all').strip().lower()
        if kind not in VALID_TYPES:
            kind = 'all'
        q = (request.GET.get('q') or '').strip()
        page = _clean_int(request.GET.get('page'), 1, lo=1)
        page_size = _clean_int(
            request.GET.get('page_size'), DEFAULT_PAGE_SIZE, lo=1, hi=MAX_PAGE_SIZE,
        )

        rows: list[dict] = []
        # Build the unified result list as Python rows so customer + business
        # records can sit side by side. The total counts on either query are
        # cheap (we're just filtering on indexed string columns), so fetching
        # both and merging is fine for an admin tool.
        if kind in ('all', 'customer'):
            cqs = BeautyUser.objects.all().order_by('-created_at')
            if q:
                cqs = cqs.filter(email__icontains=q)
            rows.extend(_customer_row(u) for u in cqs)
        if kind in ('all', 'business'):
            bqs = BusinessProvider.objects.all().order_by('-created_at')
            if q:
                bqs = bqs.filter(Q(email__icontains=q) | Q(business_name__icontains=q))
            rows.extend(_business_row(b) for b in bqs)

        # Sort the merged list by created_at desc so cross-type rows interleave
        # by recency rather than appearing as two stacked blocks.
        rows.sort(key=lambda r: r['created_at'], reverse=True)
        total = len(rows)
        start = (page - 1) * page_size
        end = start + page_size
        page_items = rows[start:end]

        return Response(
            {
                'items': page_items,
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': max(1, (total + page_size - 1) // page_size),
                'filters': {'type': kind, 'q': q},
            },
            status=status.HTTP_200_OK,
        )


class CrmSuspendView(APIView):
    """POST /api/beauty/admin/crm/suspend/  body={type, id, suspended}"""

    def post(self, request):
        err = _require_admin(request)
        if err:
            return err

        data = request.data or {}
        kind = (data.get('type') or '').strip().lower()
        try:
            target_id = int(data.get('id'))
        except (TypeError, ValueError):
            return Response({'detail': 'id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        suspended = bool(data.get('suspended'))

        if kind not in ('customer', 'business'):
            return Response(
                {'detail': 'type must be customer or business.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = datetime.now(timezone.utc) if suspended else None
        if kind == 'customer':
            updated = BeautyUser.objects.filter(id=target_id).update(
                is_suspended=suspended, suspended_at=now,
            )
            session_user_type = BeautySession.USER_TYPE_CUSTOMER
        else:
            updated = BusinessProvider.objects.filter(id=target_id).update(
                is_suspended=suspended, suspended_at=now,
            )
            session_user_type = BeautySession.USER_TYPE_BUSINESS

        if not updated:
            return Response(
                {'detail': 'Account not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if suspended:
            BeautySession.objects.filter(
                user_id=target_id, user_type=session_user_type, is_active=True,
            ).update(is_active=False)

        return Response(
            {
                'id': target_id,
                'type': kind,
                'is_suspended': suspended,
                'suspended_at': now.isoformat() if now else None,
            },
            status=status.HTTP_200_OK,
        )
