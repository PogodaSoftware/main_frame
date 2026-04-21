"""
Beauty Admin API Views
======================
Endpoints for the Beauty admin panel. Currently:

- POST /api/beauty/admin/flags/toggle/
    Body: { "key": "<flag key>", "enabled": true|false }
    Auth: requires a valid Beauty session cookie + matching X-Device-ID.
    Effect: upserts the flag row and writes an audit log entry.
"""

import logging

from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from bff_api.services.auth_service import get_authenticated_user
from bff_api.services.hateoas_service import (
    FEATURE_FLAGS,
    FEATURE_FLAG_KEYS,
    _flag,
    is_beauty_admin,
)

from .middleware import SESSION_COOKIE_NAME
from .models import BeautyFeatureFlag, BeautyFlagAudit

logger = logging.getLogger(__name__)

_FLAG_DEFAULTS = {f['key']: bool(f['default']) for f in FEATURE_FLAGS}


class FlagToggleView(APIView):
    """
    Flip a single feature flag at runtime.

    Authorisation: only principals whose (user_type, user_id) pair appears
    in the BEAUTY_ADMIN_PRINCIPALS env var (comma-separated
    `<user_type>:<user_id>` pairs, e.g. "customer:1,business:7") may
    toggle flags. We bind to the stable PK identity instead of email
    because BeautyUser and BusinessProvider are independent tables with
    no cross-table email-uniqueness constraint. Authenticated non-admins
    get 403; missing/invalid session gets 401.
    """

    def post(self, request):
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
            logger.warning(
                'Non-admin user attempted feature-flag toggle: %s (%s)',
                user.get('email'), user.get('user_type'),
            )
            return Response(
                {'detail': 'Admin privileges required.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        key = (request.data.get('key') or '').strip()
        if key not in FEATURE_FLAG_KEYS:
            return Response(
                {'detail': f'Unknown feature flag: {key}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Strict boolean validation — reject string "false", numbers, etc.
        # so callers can't accidentally enable a flag by sending the wrong
        # type (e.g. JSON "false" would be truthy under bool()).
        if 'enabled' not in request.data:
            return Response(
                {'detail': '"enabled" boolean is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        raw_enabled = request.data.get('enabled')
        if not isinstance(raw_enabled, bool):
            return Response(
                {'detail': '"enabled" must be a JSON boolean (true or false).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        new_value = raw_enabled

        with transaction.atomic():
            # Capture the *effective* prior value (DB row if it exists,
            # otherwise the env-fallback default) BEFORE the upsert so the
            # audit entry's old_value reflects what users were actually
            # seeing — not the new value we're about to write.
            prior_effective = _flag(key, default=_FLAG_DEFAULTS.get(key, True))

            row, _created = BeautyFeatureFlag.objects.select_for_update().get_or_create(
                key=key,
                defaults={'enabled': new_value},
            )
            old_value = bool(row.enabled) if not _created else prior_effective
            row.enabled = new_value
            row.updated_by_user_id = user.get('user_id')
            row.updated_by_email = user.get('email') or ''
            row.save(update_fields=['enabled', 'updated_at', 'updated_by_user_id', 'updated_by_email'])

            BeautyFlagAudit.objects.create(
                flag_key=key,
                old_value=old_value,
                new_value=new_value,
                changed_by_user_id=user.get('user_id'),
                changed_by_user_type=user.get('user_type') or '',
                changed_by_email=user.get('email') or '',
            )

        logger.info(
            'Beauty feature flag %s toggled %s -> %s by %s (%s)',
            key, old_value, new_value,
            user.get('email'), user.get('user_type'),
        )

        return Response(
            {'key': key, 'enabled': new_value, 'previous': old_value},
            status=status.HTTP_200_OK,
        )
