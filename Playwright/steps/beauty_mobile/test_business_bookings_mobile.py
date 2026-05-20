"""Smoke tests for business bookings screen (Phase 4e)."""
import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.business_bookings_page import (
    bookings_heading,
    bookings_upcoming_section,
    bookings_past_section,
)


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_bookings_renders_sections(page: Page, test_business):
    """Business bookings screen shows Upcoming and Past sections."""
    selecting_different_routes_mobile(page, "beauty_business_bookings")
    page.wait_for_timeout(2000)
    expect(page.locator(bookings_heading)).to_be_visible()
    expect(page.locator(bookings_upcoming_section)).to_be_visible()
    expect(page.locator(bookings_past_section)).to_be_visible()
