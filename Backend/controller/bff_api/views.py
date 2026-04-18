"""
BFF Resolve View
================
The single entry point for the Angular Beauty shell.

Request contract
----------------
POST /api/bff/beauty/resolve/
{
    "version":   "2.0.0",          // client app version
    "screen":    "beauty_home",    // which screen the shell wants to render
    "device_id": "dev_abc123"      // browser fingerprint (same as in auth cookie)
}

Response contract (HATEOAS envelope)
------------------------------------
Render response:
{
    "action":         "render",
    "screen":         "beauty_home",
    "data":           { ... screen-specific payload ... },
    "meta":           { "title": "..." },
    "_links":         { rel: <link object>, ... },
    "form":           { ... dynamic schema, optional ... },
    "app_version":    "2.0.0",
    "needs_update":   false
}

Redirect response:
{
    "action":         "redirect",
    "redirect_to":    "beauty_login",   // legacy bare-string field
    "reason":         "auth_required",
    "_links":         { "target": <link object>, ... },
    "app_version":    "2.0.0",
    "needs_update":   false
}

The shell stores nothing from this response — it renders once and
discards. On every navigation or page refresh the shell re-calls this
endpoint, follows the links the BFF emits, and renders the form schema
the BFF provides. Adding fields, hiding actions, or rerouting flows
happens entirely server-side ("over-the-air" UI updates).
"""

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .resolvers import (
    beauty_admin_flags,
    beauty_book,
    beauty_booking_detail,
    beauty_booking_success,
    beauty_bookings,
    beauty_business_availability,
    beauty_business_bookings,
    beauty_business_home,
    beauty_business_login,
    beauty_business_providers,
    beauty_business_service_form,
    beauty_business_services,
    beauty_category,
    beauty_home,
    beauty_login,
    beauty_profile,
    beauty_provider_detail,
    beauty_sessions,
    beauty_signup,
    beauty_users,
    beauty_wireframe,
)

logger = logging.getLogger(__name__)

APP_VERSION = '2.0.0'

SCREEN_RESOLVERS = {
    'beauty_home': beauty_home.resolve,
    'beauty_login': beauty_login.resolve,
    'beauty_signup': beauty_signup.resolve,
    'beauty_business_login': beauty_business_login.resolve,
    'beauty_wireframe': beauty_wireframe.resolve,
    'beauty_users': beauty_users.resolve,
    'beauty_business_providers': beauty_business_providers.resolve,
    'beauty_sessions': beauty_sessions.resolve,
    'beauty_admin_flags': beauty_admin_flags.resolve,
    # Customer marketplace screens
    'beauty_category': beauty_category.resolve,
    'beauty_provider_detail': beauty_provider_detail.resolve,
    'beauty_book': beauty_book.resolve,
    'beauty_booking_success': beauty_booking_success.resolve,
    'beauty_booking_detail': beauty_booking_detail.resolve,
    'beauty_bookings': beauty_bookings.resolve,
    'beauty_profile': beauty_profile.resolve,
    # Business portal screens
    'beauty_business_home': beauty_business_home.resolve,
    'beauty_business_services': beauty_business_services.resolve,
    'beauty_business_service_form': beauty_business_service_form.resolve,
    'beauty_business_availability': beauty_business_availability.resolve,
    'beauty_business_bookings': beauty_business_bookings.resolve,
}

VALID_SCREENS = frozenset(SCREEN_RESOLVERS.keys())


class BffBeautyResolveView(APIView):
    """
    Orchestrates microservices and returns a single unified render or
    redirect instruction (with hypermedia links and dynamic form schema)
    to the Angular shell.
    """

    def post(self, request):
        screen = request.data.get('screen', 'beauty_home')
        device_id = (request.data.get('device_id') or '').strip()
        client_version = (request.data.get('version') or APP_VERSION).strip()
        params = request.data.get('params') or {}
        if not isinstance(params, dict):
            params = {}

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
            result = resolver(request, screen, device_id, params)
        except Exception:
            logger.exception('BFF resolver failed for screen: %s', screen)
            return Response(
                {'detail': 'Server error resolving screen.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        result.setdefault('_links', {})
        result['app_version'] = APP_VERSION
        result['needs_update'] = client_version != APP_VERSION

        return Response(result, status=status.HTTP_200_OK)
