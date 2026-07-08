"""Routing helpers for the React Native (Expo) Beauty web build.

Mirrors ``Playwright.Hooks.hooks`` but targets the RN web bundle served by
``bunx expo start --web`` (default port 8081). Expo Router file-based routes
under ``(group)`` segments collapse to flat web paths (``/search`` not
``/(customer)/search``).

Use ``BEAUTY_MOBILE_PORT`` env to point at a different host/port; defaults
to 8081 to match ``bunx expo start --web`` defaults.
"""

from __future__ import annotations

import os
from playwright.sync_api import Page

mobile_port = os.getenv("BEAUTY_MOBILE_PORT", "8081")
mobile_host = os.getenv("BEAUTY_MOBILE_HOST", "localhost")

# Routes that the RN web build serves. Keys mirror the Angular hook so
# step files can flip targets with a single import swap.
_MOBILE_ROUTE_PATHS = {
    "beauty_home": "/(customer)/home",
    "beauty_search": "/(customer)/search",
    "beauty_category": "/(customer)/category/{slug}",
    "beauty_provider": "/(customer)/provider/{id}",
    "beauty_service": "/(customer)/service/{id}",
    "beauty_bookings": "/(customer)/bookings",
    "beauty_booking_detail": "/(customer)/bookings/{id}",
    "beauty_booking_success": "/(customer)/bookings/{id}/success",
    "beauty_reschedule": "/(customer)/bookings/{id}/reschedule",
    "beauty_chats": "/(customer)/chats",
    "beauty_chat_thread": "/(customer)/chats/{bookingId}",
    "beauty_profile": "/(customer)/profile",
    "beauty_login": "/(auth)/login",
    "beauty_signup": "/(auth)/signup",
    "beauty_welcome": "/(auth)/welcome",
    "beauty_forgot": "/(auth)/forgot",
    "beauty_business_login": "/(auth)/business-login",
    "beauty_business_signup": "/(auth)/business-signup",
    "beauty_business_home": "/(business)/home",
    "beauty_favorites": "/(customer)/favorites",
    "beauty_review_write": "/(customer)/bookings/{id}/review",
    "beauty_business_apply_entity":   "/(business)/apply/entity",
    "beauty_business_apply_services": "/(business)/apply/services",
    "beauty_business_apply_stripe":   "/(business)/apply/stripe",
    "beauty_business_apply_schedule": "/(business)/apply/schedule",
    "beauty_business_apply_tools":    "/(business)/apply/tools",
    "beauty_business_apply_review":   "/(business)/apply/review",
    # Phase 4e — business management portal
    "beauty_business_services":          "/(business)/services",
    "beauty_business_service_new":       "/(business)/services/new",
    "beauty_business_availability":      "/(business)/availability",
    "beauty_business_bookings":          "/(business)/bookings",
    "beauty_business_profile":           "/(business)/profile",
    "beauty_business_reviews":           "/(business)/reviews",
    "beauty_business_settings":          "/(business)/settings",
    "beauty_business_settings_password": "/(business)/settings/password",
    "beauty_business_settings_contact":  "/(business)/settings/contact",
}


def _build_url(route: str, **params: str) -> str:
    if route not in _MOBILE_ROUTE_PATHS:
        raise ValueError(f"Unknown mobile route: {route}")
    path = _MOBILE_ROUTE_PATHS[route]
    if params:
        path = path.format(**params)
    return f"http://{mobile_host}:{mobile_port}{path}"


def goto_mobile_route(page: Page, route: str, **params: str) -> str:
    """Navigate ``page`` to the named RN route. Returns the URL used."""
    url = _build_url(route, **params)
    page.goto(url)
    return url


def selecting_different_routes_mobile(page: Page, route: str, *args, **params):
    """Drop-in mirror of ``Hooks.hooks.selecting_different_routes`` for mobile."""
    if args and not params:
        path = _MOBILE_ROUTE_PATHS.get(route, "")
        for placeholder in ("slug", "serviceId", "bookingId", "id"):
            if "{" + placeholder + "}" in path:
                params = {placeholder: args[0]}
                break
    page.goto(_build_url(route, **params))
