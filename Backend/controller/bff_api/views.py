"""
BFF Resolve View
================
The single entry point for the Angular Beauty shell.

Request contract
----------------
POST /api/bff/beauty/resolve/
{
    "version":   "1.0.0",          // client app version
    "screen":    "beauty_home",    // which screen the shell wants to render
    "device_id": "dev_abc123"      // browser fingerprint (same as in auth cookie)
}

Response contract
-----------------
Render response:
{
    "action":         "render",
    "screen":         "beauty_home",
    "data":           { ... screen-specific payload ... },
    "meta":           { "title": "..." },
    "app_version":    "1.0.0",
    "needs_update":   false
}

Redirect response:
{
    "action":       "redirect",
    "redirect_to":  "beauty_login",
    "reason":       "auth_required"
}

The shell stores nothing from this response — it renders once and discards.
On every navigation or page refresh the shell re-calls this endpoint.
"""

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .resolvers import (
    beauty_business_login,
    beauty_home,
    beauty_login,
    beauty_signup,
)

logger = logging.getLogger(__name__)

APP_VERSION = '1.0.0'

SCREEN_RESOLVERS = {
    'beauty_home': beauty_home.resolve,
    'beauty_login': beauty_login.resolve,
    'beauty_signup': beauty_signup.resolve,
    'beauty_business_login': beauty_business_login.resolve,
}

VALID_SCREENS = frozenset(SCREEN_RESOLVERS.keys())


class BffBeautyResolveView(APIView):
    """
    Orchestrates microservices and returns a single unified render or
    redirect instruction to the Angular shell.
    """

    def post(self, request):
        screen = request.data.get('screen', 'beauty_home')
        device_id = (request.data.get('device_id') or '').strip()
        client_version = (request.data.get('version') or APP_VERSION).strip()

        if screen not in VALID_SCREENS:
            logger.warning('BFF resolve requested unknown screen: %s', screen)
            return Response(
                {'detail': f'Unknown screen: {screen}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not device_id:
            return Response(
                {'detail': 'device_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resolver = SCREEN_RESOLVERS[screen]
            result = resolver(request, screen, device_id)
        except Exception:
            logger.exception('BFF resolver failed for screen: %s', screen)
            return Response(
                {'detail': 'Server error resolving screen.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        result['app_version'] = APP_VERSION
        result['needs_update'] = client_version != APP_VERSION

        return Response(result, status=status.HTTP_200_OK)
