"""
Beauty Admin Suspend View
=========================
Admin-only REST endpoint that suspends or reinstates a customer / business
account. Used by the new admin portal (bulk suspend, suspend-confirm modal).

    POST /api/beauty/admin/crm/suspend/ — suspend or unsuspend an account.

Authorisation: a request is admin iff its (user_type, user_id) pair is in
``BEAUTY_ADMIN_PRINCIPALS`` (env var or `beauty_admin_principals` DB table).
Suspending an account also invalidates every active session for that account
so the user is signed out across all devices on the next authenticated
request.
"""

from datetime import datetime, timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from bff_api.services.auth_service import get_authenticated_user
from bff_api.services.hateoas_service import is_beauty_admin

from . import audit
from .middleware import SESSION_COOKIE_NAME
from .models import BeautySession, BeautyUser, BusinessProvider


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


class CrmSuspendView(APIView):
    """POST /api/beauty/admin/crm/suspend/  body={type, id, suspended}"""

    def post(self, request):
        err = _require_admin(request)
        if err:
            return err
        device_id = request.headers.get('X-Device-ID', '').strip()
        cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
        user = get_authenticated_user(cookie, device_id) or {}

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

        # Self-suspend guard. Suspending an account deactivates its sessions,
        # so an admin suspending their own principal would lock themselves
        # out instantly. Refuse it. (Reinstate is unreachable while suspended,
        # so we only need to block the suspend direction.)
        if (
            suspended
            and kind == (user.get('user_type') or '').strip().lower()
            and target_id == user.get('user_id')
        ):
            return Response(
                {'detail': 'You cannot suspend your own account.'},
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

        audit.log_event(
            request=request, user=user,
            action='account.suspend' if suspended else 'account.reinstate',
            target_type=kind, target_id=target_id,
            meta={'reason': (data.get('reason') or '')[:255]},
        )

        return Response(
            {
                'id': target_id,
                'type': kind,
                'is_suspended': suspended,
                'suspended_at': now.isoformat() if now else None,
            },
            status=status.HTTP_200_OK,
        )
