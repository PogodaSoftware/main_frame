"""Smoke port of the Angular review-write flow for the RN web build."""

import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.review_write_page import (
    rw_load_error,
)
from Playwright.steps.beauty_mobile._auth_helpers import ui_login_mobile


def test_review_write_shows_load_error_for_unknown_booking(page: Page, test_customer):
    ui_login_mobile(page, test_customer["email"], test_customer["password"])
    selecting_different_routes_mobile(page, "beauty_review_write", id="9999999")
    page.wait_for_timeout(2000)
    expect(page.locator(rw_load_error)).to_be_visible()


@pytest.mark.skip(reason="Phase 4c+: requires completed booking — port once booking helper migrated.")
def test_review_write_submit_happy_path(page: Page, test_customer):
    pass
