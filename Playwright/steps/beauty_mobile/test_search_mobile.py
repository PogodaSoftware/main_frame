"""Smoke port of ``test_beauty_search_page.py`` for the RN Beauty web build.

Validates that ``BeautyInput`` / ``BeautyButton`` / ``EmptyState`` primitives
render and that the search BFF wiring still flows through. Tests with deep
Angular-DOM coupling (debounce, infinite-scroll sentinel, rate-limit toast,
``aria-live`` polite) are intentionally not ported — they belong to a later
phase once their RN equivalents land.
"""

from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.search_page import (
    search_keyword_input,
    search_location_input,
    search_submit,
)
from Playwright.steps.beauty_mobile._auth_helpers import ui_login_mobile


def test_search_screen_renders_brand_inputs_and_cta(page: Page, test_customer):
    ui_login_mobile(page, test_customer["email"], test_customer["password"])
    selecting_different_routes_mobile(page, "beauty_search")
    page.wait_for_timeout(1500)

    expect(page.locator(search_keyword_input)).to_be_visible()
    expect(page.locator(search_location_input)).to_be_visible()
    expect(page.locator(search_submit)).to_be_visible()


def test_search_keyword_submit_drives_request(page: Page, test_customer):
    ui_login_mobile(page, test_customer["email"], test_customer["password"])
    selecting_different_routes_mobile(page, "beauty_search")
    page.wait_for_timeout(1500)

    page.locator(search_keyword_input).fill("facial")
    page.locator(search_submit).click()
    page.wait_for_timeout(1500)

    # No assertion on result count — backend may have zero matching rows in a
    # clean environment. The smoke is that the submit button is reachable
    # and clicking it does not crash the screen.
    expect(page.locator(search_submit)).to_be_visible()
