"""Smoke port of ``test_beauty_book_page.py`` for the RN web build."""

import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.service_detail_page import (
    service_error,
)
from Playwright.steps.beauty_mobile._auth_helpers import ui_login_mobile


@pytest.mark.skip(reason="Phase 4c: requires seeded service — port once seed helper migrated.")
def test_service_detail_renders_for_seeded_service(page: Page, test_customer):
    ui_login_mobile(page, test_customer["email"], test_customer["password"])
    selecting_different_routes_mobile(page, "beauty_service", id="1")
    page.wait_for_timeout(1500)
    expect(page.locator(service_error)).to_have_count(0)
