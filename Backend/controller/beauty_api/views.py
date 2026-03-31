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

from .middleware import SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS
from .models import BeautySession, BeautyUser, BusinessProvider
from .serializers import (
    BusinessLoginSerializer,
    BusinessProviderSignUpSerializer,
    LoginSerializer,
    SignUpSerializer,
)

logger = logging.getLogger(__name__)

COOKIE_SECURE = not settings.DEBUG


def _make_cookie_payload(user_id: int, user_type: str, device_id: str) -> dict:
    return {
        'user_id': user_id,
        'user_type': user_type,
        'device_id': device_id,
        'issued_at': datetime.now(timezone.utc).isoformat(),
    }


def _set_auth_cookie(response, signed_token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=signed_token,
        max_age=SESSION_MAX_AGE_SECONDS,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite='Strict',
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


class SignUpView(APIView):
    def post(self, request):
        serializer = SignUpSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {'message': 'Account created successfully.', 'email': user.email},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        raw_password = serializer.validated_data['password']
        device_id = serializer.validated_data['device_id']

        try:
            user = BeautyUser.objects.get(email=email)
        except BeautyUser.DoesNotExist:
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not check_password(raw_password, user.password):
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        payload = _make_cookie_payload(user.id, BeautySession.USER_TYPE_CUSTOMER, device_id)
        signed_token = signing.dumps(payload)

        _create_session(user.id, BeautySession.USER_TYPE_CUSTOMER, device_id, signed_token)

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


class BusinessProviderSignUpView(APIView):
    def post(self, request):
        serializer = BusinessProviderSignUpSerializer(data=request.data)
        if serializer.is_valid():
            provider = serializer.save()
            return Response(
                {
                    'message': 'Business account created successfully.',
                    'email': provider.email,
                    'business_name': provider.business_name,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BusinessLoginView(APIView):
    def post(self, request):
        serializer = BusinessLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        raw_password = serializer.validated_data['password']
        device_id = serializer.validated_data['device_id']

        try:
            provider = BusinessProvider.objects.get(email=email)
        except BusinessProvider.DoesNotExist:
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not check_password(raw_password, provider.password):
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        payload = _make_cookie_payload(provider.id, BeautySession.USER_TYPE_BUSINESS, device_id)
        signed_token = signing.dumps(payload)

        _create_session(provider.id, BeautySession.USER_TYPE_BUSINESS, device_id, signed_token)

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
