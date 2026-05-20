"""Smoke tests for business availability screen (Phase 4e)."""
import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.business_availability_page import (
    availability_heading,
    availability_save_btn,
)


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_availability_renders_weekly_grid(page: Page, test_business):
    """Availability screen shows weekly hours heading and save button."""
    selecting_different_routes_mobile(page, "beauty_business_availability")
    page.wait_for_timeout(2000)
    expect(page.locator(availability_heading)).to_be_visible()
    expect(page.locator(availability_save_btn)).to_be_visible()


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_availability_save_button_enabled(page: Page, test_business):
    """Save button is not disabled on initial load."""
    selecting_different_routes_mobile(page, "beauty_business_availability")
    page.wait_for_timeout(2000)
    expect(page.locator(availability_save_btn)).to_be_enabled()
