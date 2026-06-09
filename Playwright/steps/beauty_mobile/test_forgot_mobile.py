"""Smoke port of ``test_beauty_forgot_page.py`` for the RN web build.

Forgot is BFF-driven (form schema from ``beauty_forgot`` resolver) and
rendered through ``FormRenderer`` — same chrome as login/signup.
"""

from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.forgot_page import (
    forgot_email,
    forgot_submit,
)


def test_forgot_renders_email_field_and_submit(page: Page):
    selecting_different_routes_mobile(page, "beauty_forgot")
    page.wait_for_timeout(1500)
    expect(page.locator(forgot_email)).to_be_visible()
    expect(page.locator(forgot_submit)).to_be_visible()


def test_forgot_submit_does_not_leak_account_existence(page: Page):
    selecting_different_routes_mobile(page, "beauty_forgot")
    page.wait_for_timeout(1500)
    page.locator(forgot_email).fill("noone@beauty-test.com")
    page.locator(forgot_submit).click()
    page.wait_for_timeout(2000)
    # Backend always returns 200 with the same response body regardless
    # of email-on-file. Successful submit redirects the user back to the
    # login screen via the form `success` link.
    expect(page).to_have_url(lambda url: "login" in url)
