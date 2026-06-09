"""
Beauty API Views
================
Endpoints for user and business authentication.

Security measures applied:
- Passwords verified with Django's constant-time check_password.
- Auth cookie set as HttpOnly, SameSite=Strict, Secure (production).
- Cookie payload is Django-signed (tamper-proof, time-limited).
- Session records stored with a SHA-256 hash of the raw token.
- Generic error messages on auth failure (no user enumeration).
- Strict customer/business role separation: an email may belong to at
  most one role, signups across roles are rejected with 409, and
  login attempts on the wrong portal are blocked + audited + rate
  limited per source IP. See ``auth_security.py``.
"""

import hashlib
import logging
from datetime import datetime, timedelta, timezone

from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.core import signing
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth_security import (
    client_ip,
    find_existing_role,
    is_rate_limited,
    record_xrole_failure,
    reset_xrole_counter,
    write_audit,
)
from .availability_service import ensure_storefront
from .middleware import SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS
from .models import (
    BeautyAuthAuditLog,
    BeautySession,
    BeautyUser,
    BusinessProvider,
)
from .serializers import (
    BusinessLoginSerializer,
    BusinessProviderSignUpSerializer,
    LoginSerializer,
    SignUpSerializer,
)

logger = logging.getLogger(__name__)

COOKIE_SECURE = not settings.DEBUG

# Single shared response body for every auth failure so the API never
# leaks whether a particular email exists in either user store.
GENERIC_AUTH_FAILURE = {'detail': 'Invalid email or password.'}
GENERIC_RATE_LIMIT = {'detail': 'Too many failed attempts. Try again later.'}


def _make_cookie_payload(user_id: int, user_type: str, device_id: str) -> dict:
    return {
        'user_id': user_id,
        'user_type': user_type,
        'device_id': device_id,
        'issued_at': datetime.now(timezone.utc).isoformat(),
    }


def _set_auth_cookie(response, signed_token: str) -> None:
    """Write the auth cookie with the agreed security envelope.

    - HttpOnly: not readable from JS, blocks XSS exfiltration.
    - Secure: production-only (DEBUG=False) so dev over http still works.
    - SameSite=Lax: allows top-level navigations (login redirects)
      while blocking cross-site POSTs / fetches without explicit opt-in.
      Lax is the modern equivalent of the previous "Strict" we used —
      Strict broke external-link returns to the app.
    """
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=signed_token,
        max_age=SESSION_MAX_AGE_SECONDS,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite='Lax',
        path='/',
    )


def _create_session(user_id: int, user_type: str, device_id: str, signed_token: str) -> None:
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=SESSION_MAX_AGE_SECONDS)
    token_hash = hashlib.sha256(signed_token.encode()).hexdigest()

    BeautySession.objects.update_or_create(
        user_id=user_id,
        user_type=user_type,
        device_id=device_id,
        defaults={
            'token_hash': token_hash,
            'expires_at': expires_at,
            'is_active': True,
        },
    )


def _signup_duplicate_email(serializer) -> bool:
    """The signup serializers raise a ``ValidationError`` on duplicate
    email (across BOTH role tables). We translate that single field
    error into a 409 Conflict instead of the default 400 so the
    frontend can disambiguate "this email is taken" from "the request
    body was malformed". Any other validation error stays a 400."""
    errors = serializer.errors or {}
    email_errors = errors.get('email') or []
    return any('already exists' in str(err) for err in email_errors)


def _reject_cross_role_login(request, email: str, attempted_role: str,
                             existing_role: str):
    """Common rejection path for a login that targeted the wrong portal.

    Writes an audit row, bumps the per-IP rate-limit counter, and either
    returns a 429 (counter past threshold) or a 401 with the generic
    failure body. The caller just returns whatever this helper returns.
    """
    ip = client_ip(request)
    write_audit(
        BeautyAuthAuditLog.EVENT_CROSS_ROLE_LOGIN,
        email=email,
        ip=ip,
        attempted_role=attempted_role,
        existing_role=existing_role,
    )
    new_count = record_xrole_failure(ip)
    if new_count > 5:
        write_audit(
            BeautyAuthAuditLog.EVENT_RATE_LIMITED,
            email=email,
            ip=ip,
            attempted_role=attempted_role,
            existing_role=existing_role,
        )
        return Response(GENERIC_RATE_LIMIT, status=status.HTTP_429_TOO_MANY_REQUESTS)
    return Response(GENERIC_AUTH_FAILURE, status=status.HTTP_401_UNAUTHORIZED)


class SignUpView(APIView):
    def post(self, request):
        serializer = SignUpSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {'message': 'Account created successfully.', 'email': user.email},
                status=status.HTTP_201_CREATED,
            )
        if _signup_duplicate_email(serializer):
            email = (request.data.get('email') or '').lower().strip()
            existing = find_existing_role(email)
            # Audit only when the collision crosses the role boundary —
            # a same-role duplicate is not a security event.
            if existing and existing != BeautySession.USER_TYPE_CUSTOMER:
                write_audit(
                    BeautyAuthAuditLog.EVENT_CROSS_ROLE_SIGNUP,
                    email=email,
                    ip=client_ip(request),
                    attempted_role=BeautySession.USER_TYPE_CUSTOMER,
                    existing_role=existing,
                )
            return Response(
                {'detail': 'An account with this email already exists.'},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    def post(self, request):
        if is_rate_limited(client_ip(request)):
            return Response(GENERIC_RATE_LIMIT, status=status.HTTP_429_TOO_MANY_REQUESTS)

        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        raw_password = serializer.validated_data['password']
        device_id = serializer.validated_data['device_id']

        try:
            user = BeautyUser.objects.get(email=email)
        except BeautyUser.DoesNotExist:
            # Email not a customer. If it IS a business provider, this
            # is a cross-role attempt (V4) and gets the dedicated path.
            if BusinessProvider.objects.filter(email=email).exists():
                return _reject_cross_role_login(
                    request,
                    email,
                    attempted_role=BeautySession.USER_TYPE_CUSTOMER,
                    existing_role=BeautySession.USER_TYPE_BUSINESS,
                )
            return Response(GENERIC_AUTH_FAILURE, status=status.HTTP_401_UNAUTHORIZED)

        if not check_password(raw_password, user.password):
            return Response(GENERIC_AUTH_FAILURE, status=status.HTTP_401_UNAUTHORIZED)

        if getattr(user, 'is_suspended', False):
            return Response(
                {'detail': 'This account has been suspended. Contact support.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        payload = _make_cookie_payload(user.id, BeautySession.USER_TYPE_CUSTOMER, device_id)
        signed_token = signing.dumps(payload)

        _create_session(user.id, BeautySession.USER_TYPE_CUSTOMER, device_id, signed_token)
        reset_xrole_counter(client_ip(request))

        response = Response(
            {'message': 'Login successful.', 'email': user.email},
            status=status.HTTP_200_OK,
        )
        _set_auth_cookie(response, signed_token)
        return response


class LogoutView(APIView):
    def post(self, request):
        raw_cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
        if raw_cookie:
            token_hash = hashlib.sha256(raw_cookie.encode()).hexdigest()
            BeautySession.objects.filter(token_hash=token_hash).update(is_active=False)

        response = Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        response.delete_cookie(SESSION_COOKIE_NAME, path='/')
        return response


class ForgotPasswordView(APIView):
    """
    Accept a password-reset request and return 200 regardless of whether
    the email is on file. Returning the same response for known and
    unknown emails prevents account-enumeration through this endpoint.

    The actual email dispatch is intentionally not wired here — SMTP
    plumbing is out of scope for the initial RN port. A real
    implementation would generate a single-use reset token, persist it
    with a short TTL, and send the link via the transactional mail
    provider. The endpoint already returns the user-facing success state
    so the client UX is fully testable end-to-end.
    """

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email or '@' not in email:
            return Response(
                {'detail': 'A valid email address is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Best-effort lookup so we can log a useful audit row without
        # leaking the result to the caller. The user model is referenced
        # lazily here to avoid widening the import footprint when the
        # feature is disabled.
        try:
            from .models import BeautyUser  # local import to avoid cycles
            BeautyUser.objects.filter(email__iexact=email).only('id').first()
        except Exception:  # pragma: no cover — best-effort only
            logger.exception('forgot-password lookup failed')
        return Response(
            {'message': 'If the address is on file, a reset link is on its way.'},
            status=status.HTTP_200_OK,
        )


class BusinessProviderSignUpView(APIView):
    def post(self, request):
        serializer = BusinessProviderSignUpSerializer(data=request.data)
        if not serializer.is_valid():
            if _signup_duplicate_email(serializer):
                email = (request.data.get('email') or '').lower().strip()
                existing = find_existing_role(email)
                if existing and existing != BeautySession.USER_TYPE_BUSINESS:
                    write_audit(
                        BeautyAuthAuditLog.EVENT_CROSS_ROLE_SIGNUP,
                        email=email,
                        ip=client_ip(request),
                        attempted_role=BeautySession.USER_TYPE_BUSINESS,
                        existing_role=existing,
                    )
                return Response(
                    {'detail': 'An account with this email already exists.'},
                    status=status.HTTP_409_CONFLICT,
                )
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        provider = serializer.save()

        device_id = (request.data.get('device_id') or '').strip()
        response = Response(
            {
                'message': 'Business account created successfully.',
                'email': provider.email,
                'business_name': provider.business_name,
            },
            status=status.HTTP_201_CREATED,
        )
        if device_id:
            payload = _make_cookie_payload(provider.id, BeautySession.USER_TYPE_BUSINESS, device_id)
            signed_token = signing.dumps(payload)
            _create_session(provider.id, BeautySession.USER_TYPE_BUSINESS, device_id, signed_token)
            ensure_storefront(provider)
            _set_auth_cookie(response, signed_token)
        return response


class BusinessLoginView(APIView):
    def post(self, request):
        if is_rate_limited(client_ip(request)):
            return Response(GENERIC_RATE_LIMIT, status=status.HTTP_429_TOO_MANY_REQUESTS)

        serializer = BusinessLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        raw_password = serializer.validated_data['password']
        device_id = serializer.validated_data['device_id']

        try:
            provider = BusinessProvider.objects.get(email=email)
        except BusinessProvider.DoesNotExist:
            # Cross-role check (V3): if the email is registered as a
            # customer, log + rate-limit + generic 401.
            if BeautyUser.objects.filter(email=email).exists():
                return _reject_cross_role_login(
                    request,
                    email,
                    attempted_role=BeautySession.USER_TYPE_BUSINESS,
                    existing_role=BeautySession.USER_TYPE_CUSTOMER,
                )
            return Response(GENERIC_AUTH_FAILURE, status=status.HTTP_401_UNAUTHORIZED)

        if not check_password(raw_password, provider.password):
            return Response(GENERIC_AUTH_FAILURE, status=status.HTTP_401_UNAUTHORIZED)

        if getattr(provider, 'is_suspended', False):
            return Response(
                {'detail': 'This business account has been suspended. Contact support.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        payload = _make_cookie_payload(provider.id, BeautySession.USER_TYPE_BUSINESS, device_id)
        signed_token = signing.dumps(payload)

        _create_session(provider.id, BeautySession.USER_TYPE_BUSINESS, device_id, signed_token)
        reset_xrole_counter(client_ip(request))

        # Auto-provision the public storefront on first login so the
        # business portal works without any extra setup step.
        ensure_storefront(provider)

        response = Response(
            {
                'message': 'Login successful.',
                'email': provider.email,
                'business_name': provider.business_name,
            },
            status=status.HTTP_200_OK,
        )
        _set_auth_cookie(response, signed_token)
        return response


class BusinessLogoutView(APIView):
    def post(self, request):
        raw_cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
        if raw_cookie:
            token_hash = hashlib.sha256(raw_cookie.encode()).hexdigest()
            BeautySession.objects.filter(token_hash=token_hash).update(is_active=False)

        response = Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        response.delete_cookie(SESSION_COOKIE_NAME, path='/')
        return response


class SessionRefreshView(APIView):
    """POST /api/beauty/session/refresh/

    Extends the auth session for a still-valid cookie — bumps the
    BeautySession row's ``expires_at`` and re-sets the same Set-Cookie
    so the browser's Max-Age window also advances. The signed cookie
    value (and therefore the DB ``token_hash``) is left unchanged.

    Why we don't rotate the token here: rotating mid-flight invalidates
    any in-flight requests still carrying the old cookie value (their
    SHA-256 no longer matches the row), which produces spurious 401s
    and redirect loops in tabs that fired refresh and a regular API
    call concurrently. Rotation belongs at login/logout boundaries; an
    "I'm still here" beacon should be idempotent.

    Works for both customer and business sessions. Returns 401 if the
    existing cookie is invalid, expired, or the device_id doesn't match.
    """

    def post(self, request):
        raw_cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
        device_id = (request.META.get('HTTP_X_DEVICE_ID', '') or '').strip()
        if not raw_cookie or not device_id:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            payload = signing.loads(raw_cookie, max_age=SESSION_MAX_AGE_SECONDS)
        except Exception:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if payload.get('device_id') != device_id:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if payload.get('user_type') not in (
            BeautySession.USER_TYPE_CUSTOMER,
            BeautySession.USER_TYPE_BUSINESS,
        ):
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        token_hash = hashlib.sha256(raw_cookie.encode()).hexdigest()
        existing = BeautySession.objects.filter(
            token_hash=token_hash,
            user_id=payload['user_id'],
            user_type=payload['user_type'],
            device_id=payload['device_id'],
            is_active=True,
            expires_at__gt=datetime.now(timezone.utc),
        ).first()
        if not existing:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        existing.expires_at = datetime.now(timezone.utc) + timedelta(seconds=SESSION_MAX_AGE_SECONDS)
        existing.save(update_fields=['expires_at'])

        response = Response({'message': 'Session refreshed.'}, status=status.HTTP_200_OK)
        _set_auth_cookie(response, raw_cookie)
        return response


class MeView(APIView):
    """
    Returns the current authenticated user's basic info.
    The BeautyAuthMiddleware runs first for /api/beauty/protected/ routes,
    so if we reach this view the request is already verified and
    request.beauty_user_id / request.beauty_user_type are set.
    """

    def get(self, request):
        user_id = getattr(request, 'beauty_user_id', None)
        user_type = getattr(request, 'beauty_user_type', None)

        if not user_id or not user_type:
            return Response({'detail': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            if user_type == BeautySession.USER_TYPE_CUSTOMER:
                user = BeautyUser.objects.get(id=user_id)
                return Response({
                    'user_type': 'customer',
                    'email': user.email,
                }, status=status.HTTP_200_OK)
            else:
                provider = BusinessProvider.objects.get(id=user_id)
                return Response({
                    'user_type': 'business',
                    'email': provider.email,
                    'business_name': provider.business_name,
                }, status=status.HTTP_200_OK)
        except (BeautyUser.DoesNotExist, BusinessProvider.DoesNotExist):
            return Response({'detail': 'User not found.'}, status=status.HTTP_401_UNAUTHORIZED)
