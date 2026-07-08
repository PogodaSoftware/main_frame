"""Smoke port of ``test_beauty_welcome_page.py`` for the RN web build."""

from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.welcome_page import (
    welcome_brand_name,
    welcome_google,
    welcome_signin,
    welcome_signup,
)


def test_welcome_renders_brand_and_three_ctas(page: Page):
    selecting_different_routes_mobile(page, "beauty_welcome")
    page.wait_for_timeout(1000)
    expect(page.locator(welcome_brand_name)).to_have_text("Beauty")
    expect(page.locator(welcome_signin)).to_be_visible()
    expect(page.locator(welcome_signup)).to_be_visible()
    expect(page.locator(welcome_google)).to_be_visible()


def test_welcome_signin_navigates_to_login(page: Page):
    selecting_different_routes_mobile(page, "beauty_welcome")
    page.wait_for_timeout(1000)
    page.locator(welcome_signin).click()
    page.wait_for_timeout(1500)
    expect(page).to_have_url(lambda url: "login" in url)


def test_welcome_signup_navigates_to_signup(page: Page):
    selecting_different_routes_mobile(page, "beauty_welcome")
    page.wait_for_timeout(1000)
    page.locator(welcome_signup).click()
    page.wait_for_timeout(1500)
    expect(page).to_have_url(lambda url: "signup" in url)
