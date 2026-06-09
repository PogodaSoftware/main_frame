"""Smoke port for the RN reschedule screen (no direct Angular test analogue,
covered transitively by ``test_beauty_e2e_booking_flow.py`` reschedule branch).
"""

import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.reschedule_page import (
    reschedule_current_card,
    reschedule_error,
)
from Playwright.steps.beauty_mobile._auth_helpers import ui_login_mobile


@pytest.mark.skip(reason="Phase 4c: requires booked appointment — port once booking helper migrated.")
def test_reschedule_renders_current_card(page: Page, test_customer):
    ui_login_mobile(page, test_customer["email"], test_customer["password"])
    selecting_different_routes_mobile(page, "beauty_reschedule", id="1")
    page.wait_for_timeout(1500)
    expect(page.locator(reschedule_error)).to_have_count(0)
    expect(page.locator(reschedule_current_card)).to_be_visible()
