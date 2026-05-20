"""Smoke tests for the business home dashboard screen (Phase 4e)."""
import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.business_home_page import (
    business_home_logout_btn,
)


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_business_home_renders_dashboard(page: Page, test_business):
    """Business home resolves beauty_business_home and shows dashboard chrome."""
    selecting_different_routes_mobile(page, "beauty_business_home")
    page.wait_for_timeout(2000)
    expect(page.locator(":text('Dashboard')")).to_be_visible()


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_business_home_shows_kpis(page: Page, test_business):
    """KPI cards (Services, Upcoming, This month) are all visible."""
    selecting_different_routes_mobile(page, "beauty_business_home")
    page.wait_for_timeout(2000)
    expect(page.locator(":text('Services')")).to_be_visible()
    expect(page.locator(":text('Upcoming')")).to_be_visible()


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_business_home_signout_visible(page: Page, test_business):
    """Sign out button is present on the home screen."""
    selecting_different_routes_mobile(page, "beauty_business_home")
    page.wait_for_timeout(2000)
    expect(page.locator(business_home_logout_btn)).to_be_visible()
