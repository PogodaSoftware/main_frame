"""Smoke port of ``test_beauty_favorites.py`` for the RN web build."""

from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.favorites_page import (
    favorites_empty,
    favorites_title,
)
from Playwright.steps.beauty_mobile._auth_helpers import ui_login_mobile


def test_favorites_empty_state_for_fresh_customer(page: Page, test_customer):
    ui_login_mobile(page, test_customer["email"], test_customer["password"])
    selecting_different_routes_mobile(page, "beauty_favorites")
    page.wait_for_timeout(2000)
    expect(page.locator(favorites_title)).to_be_visible()
    expect(page.locator(favorites_empty)).to_be_visible()
