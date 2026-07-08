"""Smoke tests for business profile / earnings screen (Phase 4e)."""
import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.business_profile_page import (
    profile_heading,
    profile_earnings_month,
    profile_earnings_lifetime,
)


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_profile_renders_earnings(page: Page, test_business):
    """Business profile shows earnings cards."""
    selecting_different_routes_mobile(page, "beauty_business_profile")
    page.wait_for_timeout(2000)
    expect(page.locator(profile_heading)).to_be_visible()
    expect(page.locator(profile_earnings_month)).to_be_visible()
    expect(page.locator(profile_earnings_lifetime)).to_be_visible()
