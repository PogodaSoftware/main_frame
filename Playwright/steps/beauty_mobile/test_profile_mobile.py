"""Smoke port of ``test_beauty_profile_page.py`` for the RN web build."""

from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.profile_page import (
    profile_email,
    profile_signout,
    profile_title,
)
from Playwright.steps.beauty_mobile._auth_helpers import ui_login_mobile


def test_profile_renders_brand_chrome(page: Page, test_customer):
    ui_login_mobile(page, test_customer["email"], test_customer["password"])
    selecting_different_routes_mobile(page, "beauty_profile")
    page.wait_for_timeout(1500)

    expect(page.locator(profile_title)).to_be_visible()
    expect(page.locator(profile_email)).to_contain_text(test_customer["email"])
    expect(page.locator(profile_signout)).to_be_visible()


def test_profile_signout_redirects_to_login(page: Page, test_customer):
    ui_login_mobile(page, test_customer["email"], test_customer["password"])
    selecting_different_routes_mobile(page, "beauty_profile")
    page.wait_for_timeout(1500)

    page.locator(profile_signout).click()
    page.wait_for_timeout(2000)
    expect(page).to_have_url(lambda url: "login" in url)
