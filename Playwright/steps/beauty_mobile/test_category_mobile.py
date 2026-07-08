"""Smoke port of ``test_beauty_category_page.py`` for the RN web build."""

from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.category_page import (
    category_empty,
    category_error,
)
from Playwright.steps.beauty_mobile._auth_helpers import ui_login_mobile


def test_category_route_renders_without_error(page: Page, test_customer):
    ui_login_mobile(page, test_customer["email"], test_customer["password"])
    selecting_different_routes_mobile(page, "beauty_category", slug="facial")
    page.wait_for_timeout(1500)

    # Either we show the empty state (no providers seeded) or we render
    # provider cards. Either way we should never surface the error testID.
    expect(page.locator(category_error)).to_have_count(0)
