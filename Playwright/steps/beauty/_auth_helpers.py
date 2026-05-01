"""Shared helpers for Beauty step files that need a logged-in customer."""

from playwright.sync_api import Page, expect

from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.pogoda.beauty.login_page import (
    email_input as login_email_input,
    password_input as login_password_input,
    submit_button as login_submit_button,
)
from Playwright.pages.pogoda.beauty.home_page import home_page_root


def ui_login(page: Page, email: str, password: str, *, wait_for_home: bool = True) -> None:
    """Drive the login UI and (optionally) wait for the home page to render."""
    selecting_different_routes(page, 'beauty_login')
    page.wait_for_timeout(1500)
    page.locator(login_email_input).fill(email)
    page.locator(login_password_input).fill(password)
    page.locator(login_submit_button).click()
    page.wait_for_timeout(3000)
    if wait_for_home:
        expect(page.locator(home_page_root)).to_be_visible()
