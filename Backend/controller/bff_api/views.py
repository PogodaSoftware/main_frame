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

from beauty_api.middleware import SESSION_COOKIE_NAME
from .services import hateoas_service as h
from .services.auth_service import get_authenticated_user

from .resolvers import (
    beauty_admin_flags,
    beauty_admin_portal_signin,
    beauty_admin_portal_2fa,
    beauty_admin_portal_magic,
    beauty_admin_portal_ip_warning,
    beauty_admin_portal_dashboard,
    beauty_admin_portal_dashboard_v2,
    beauty_admin_portal_notifications,
    beauty_admin_portal_crm,
    beauty_admin_portal_tag_manager,
    beauty_admin_portal_suspend,
    beauty_admin_portal_customer_detail,
    beauty_admin_portal_provider_detail,
    beauty_admin_portal_bookings,
    beauty_admin_portal_booking_detail,
    beauty_admin_portal_tickets,
    beauty_admin_portal_team,
    beauty_admin_portal_audit,
    beauty_book,
    beauty_booking_detail,
    beauty_booking_success,
    beauty_bookings,
    beauty_business_application_entity,
    beauty_business_application_review,
    beauty_business_application_schedule,
    beauty_business_application_services,
    beauty_business_application_stripe,
    beauty_business_application_tools,
    beauty_business_availability,
    beauty_business_bookings,
    beauty_business_change_password,
    beauty_business_email_contact,
    beauty_business_home,
    beauty_business_messages,
    beauty_business_notifications,
    beauty_business_profile,
    beauty_business_reviews,
    beauty_business_settings,
    beauty_business_login,
    beauty_business_service_form,
    beauty_business_services,
    beauty_business_signup,
    beauty_category,
    beauty_chat_thread,
    beauty_chats,
    beauty_favorites,
    beauty_forgot,
    beauty_google_auth,
    beauty_home,
    beauty_login,
    beauty_profile,
    beauty_provider_detail,
    beauty_reschedule,
    beauty_service_reviews,
    beauty_service_search,
    beauty_sessions,
    beauty_signup,
    beauty_wireframe,
)

logger = logging.getLogger(__name__)

APP_VERSION = '2.0.0'

SCREEN_RESOLVERS = {
    'beauty_home': beauty_home.resolve,
    'beauty_login': beauty_login.resolve,
    'beauty_google_auth': beauty_google_auth.resolve,
    'beauty_signup': beauty_signup.resolve,
    'beauty_forgot': beauty_forgot.resolve,
    'beauty_business_login': beauty_business_login.resolve,
    'beauty_business_signup': beauty_business_signup.resolve,
    'beauty_business_application_entity':   beauty_business_application_entity.resolve,
    'beauty_business_application_services': beauty_business_application_services.resolve,
    'beauty_business_application_stripe':   beauty_business_application_stripe.resolve,
    'beauty_business_application_schedule': beauty_business_application_schedule.resolve,
    'beauty_business_application_tools':    beauty_business_application_tools.resolve,
    'beauty_business_application_review':   beauty_business_application_review.resolve,
    'beauty_wireframe': beauty_wireframe.resolve,
    'beauty_sessions': beauty_sessions.resolve,
    'beauty_admin_flags': beauty_admin_flags.resolve,
    'beauty_admin_portal_signin': beauty_admin_portal_signin.resolve,
    'beauty_admin_portal_2fa': beauty_admin_portal_2fa.resolve,
    'beauty_admin_portal_magic': beauty_admin_portal_magic.resolve,
    'beauty_admin_portal_ip_warning': beauty_admin_portal_ip_warning.resolve,
    'beauty_admin_portal_dashboard': beauty_admin_portal_dashboard.resolve,
    'beauty_admin_portal_dashboard_v2': beauty_admin_portal_dashboard_v2.resolve,
    'beauty_admin_portal_notifications': beauty_admin_portal_notifications.resolve,
    'beauty_admin_portal_crm': beauty_admin_portal_crm.resolve,
    'beauty_admin_portal_tag_manager': beauty_admin_portal_tag_manager.resolve,
    'beauty_admin_portal_suspend': beauty_admin_portal_suspend.resolve,
    'beauty_admin_portal_customer_detail': beauty_admin_portal_customer_detail.resolve,
    'beauty_admin_portal_provider_detail': beauty_admin_portal_provider_detail.resolve,
    'beauty_admin_portal_bookings': beauty_admin_portal_bookings.resolve,
    'beauty_admin_portal_booking_detail': beauty_admin_portal_booking_detail.resolve,
    'beauty_admin_portal_tickets': beauty_admin_portal_tickets.resolve,
    'beauty_admin_portal_team': beauty_admin_portal_team.resolve,
    'beauty_admin_portal_audit': beauty_admin_portal_audit.resolve,
    # Customer marketplace screens
    'beauty_category': beauty_category.resolve,
    'beauty_provider_detail': beauty_provider_detail.resolve,
    'beauty_service_search': beauty_service_search.resolve,
    'beauty_service_reviews': beauty_service_reviews.resolve,
    'beauty_favorites': beauty_favorites.resolve,
    'beauty_book': beauty_book.resolve,
    'beauty_booking_success': beauty_booking_success.resolve,
    'beauty_booking_detail': beauty_booking_detail.resolve,
    'beauty_reschedule': beauty_reschedule.resolve,
    'beauty_bookings': beauty_bookings.resolve,
    'beauty_profile': beauty_profile.resolve,
    'beauty_chats': beauty_chats.resolve,
    'beauty_chat_thread': beauty_chat_thread.resolve,
    'beauty_business_messages': beauty_business_messages.resolve,
    'beauty_business_notifications': beauty_business_notifications.resolve,
    # Business portal screens
    'beauty_business_home': beauty_business_home.resolve,
    'beauty_business_services': beauty_business_services.resolve,
    'beauty_business_service_form': beauty_business_service_form.resolve,
    'beauty_business_availability': beauty_business_availability.resolve,
    'beauty_business_bookings': beauty_business_bookings.resolve,
    'beauty_business_settings': beauty_business_settings.resolve,
    'beauty_business_change_password': beauty_business_change_password.resolve,
    'beauty_business_email_contact': beauty_business_email_contact.resolve,
    'beauty_business_profile': beauty_business_profile.resolve,
    'beauty_business_reviews': beauty_business_reviews.resolve,
}

VALID_SCREENS = frozenset(SCREEN_RESOLVERS.keys())

# ── Cross-context separation (defense-in-depth) ────────────────────────────
# The web route guards enforce this client-side too. Each portal's *post-auth*
# screens reject a principal of another type: a signed-in business landing on
# a customer screen is redirected to its own home, and vice-versa. Auth entry
# points and genuinely shared screens (chats / chat_thread — RN business uses
# them, and RN shares this BFF) are intentionally NOT listed, so nothing
# cross-redirects them.
_CUSTOMER_SCREENS = frozenset({
    'beauty_home', 'beauty_category', 'beauty_provider_detail',
    'beauty_service_search', 'beauty_service_reviews', 'beauty_favorites',
    'beauty_book', 'beauty_booking_success', 'beauty_booking_detail',
    'beauty_reschedule', 'beauty_bookings', 'beauty_profile',
})
_BUSINESS_SCREENS = frozenset({
    'beauty_business_home', 'beauty_business_services', 'beauty_business_service_form',
    'beauty_business_availability', 'beauty_business_bookings', 'beauty_business_profile',
    'beauty_business_reviews', 'beauty_business_settings', 'beauty_business_change_password',
    'beauty_business_email_contact', 'beauty_business_messages', 'beauty_business_notifications',
})
# Post-auth admin screens: every admin portal screen that requires a valid
# admin session. Pre-auth entry points (signin, ip_warning) are intentionally
# excluded so unauthenticated flows reach their own resolver guards.
# beauty_admin_portal_2fa and beauty_admin_portal_magic are in this set
# because they sit after the signin step and must not be reachable by
# non-admin principals (they have their own resolver guards too — defence-in-depth).
_ADMIN_SCREENS = frozenset({
    'beauty_admin_flags',
    'beauty_admin_portal_2fa',
    'beauty_admin_portal_magic',
    'beauty_admin_portal_dashboard',
    'beauty_admin_portal_dashboard_v2',
    'beauty_admin_portal_notifications',
    'beauty_admin_portal_crm',
    'beauty_admin_portal_tag_manager',
    'beauty_admin_portal_suspend',
    'beauty_admin_portal_customer_detail',
    'beauty_admin_portal_provider_detail',
    'beauty_admin_portal_bookings',
    'beauty_admin_portal_booking_detail',
    'beauty_admin_portal_tickets',
    'beauty_admin_portal_team',
    'beauty_admin_portal_audit',
})


def _context_redirect(user_type, screen, principal=None):
    """Return a redirect envelope when a signed-in principal is on the wrong
    portal's screen, else None.

    Admin-screen gate: non-admins are bounced to their own home before the
    resolver ever runs. Admins keep access to their base customer/business
    screens (an admin IS a base account).
    """
    # ponytail: principal is passed only for the admin check; user_type alone
    # is enough for the customer↔business gate. is_beauty_admin(None) is False.
    if screen in _ADMIN_SCREENS:
        if not h.is_beauty_admin(principal):
            dest = 'beauty_business_home' if user_type == 'business' else 'beauty_home'
            return h.redirect_envelope(dest, 'forbidden')
        return None  # admin — allow through
    if user_type == 'business' and screen in _CUSTOMER_SCREENS:
        return h.redirect_envelope('beauty_business_home', 'wrong_context')
    if user_type == 'customer' and screen in _BUSINESS_SCREENS:
        return h.redirect_envelope('beauty_home', 'wrong_context')
    return None


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

        # Defense-in-depth: a signed-in principal on the other portal's screen
        # is redirected to its own home before the resolver ever runs.
        principal = get_authenticated_user(request.COOKIES.get(SESSION_COOKIE_NAME), device_id)
        if principal:
            redirect = _context_redirect(principal.get('user_type'), screen, principal)
            if redirect is not None:
                redirect.setdefault('_links', {})
                redirect['app_version'] = APP_VERSION
                redirect['needs_update'] = client_version != APP_VERSION
                return Response(redirect, status=status.HTTP_200_OK)

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
