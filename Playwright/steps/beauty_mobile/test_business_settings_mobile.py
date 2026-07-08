"""Smoke tests for business settings screens (Phase 4e)."""
import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.business_settings_page import (
    settings_heading,
    settings_row,
    pw_field_current,
    pw_submit,
    contact_field_public_email,
    contact_submit,
)


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_settings_hub_renders(page: Page, test_business):
    """Settings hub shows heading and at least the change-password row."""
    selecting_different_routes_mobile(page, "beauty_business_settings")
    page.wait_for_timeout(2000)
    expect(page.locator(settings_heading)).to_be_visible()
    expect(page.locator(settings_row("password"))).to_be_visible()


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_change_password_renders(page: Page, test_business):
    """Change password sub-screen shows current password field and submit."""
    selecting_different_routes_mobile(page, "beauty_business_settings_password")
    page.wait_for_timeout(2000)
    expect(page.locator(pw_field_current)).to_be_visible()
    expect(page.locator(pw_submit)).to_be_visible()


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_email_contact_renders(page: Page, test_business):
    """Email & contact sub-screen shows public email field and submit."""
    selecting_different_routes_mobile(page, "beauty_business_settings_contact")
    page.wait_for_timeout(2000)
    expect(page.locator(contact_field_public_email)).to_be_visible()
    expect(page.locator(contact_submit)).to_be_visible()
