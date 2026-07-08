"""Smoke port of ``test_beauty_booking_success_page.py`` for the RN web build."""

import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.booking_success_page import (
    booking_success_error,
)
from Playwright.steps.beauty_mobile._auth_helpers import ui_login_mobile


@pytest.mark.skip(reason="Phase 4c: requires fresh booking — port once booking helper migrated.")
def test_booking_success_renders_warning_strip(page: Page, test_customer):
    ui_login_mobile(page, test_customer["email"], test_customer["password"])
    selecting_different_routes_mobile(page, "beauty_booking_success", id="1")
    page.wait_for_timeout(1500)
    expect(page.locator(booking_success_error)).to_have_count(0)
