"""UI login helper for the RN Beauty web build.

The RN login form is rendered by ``FormRenderer`` (BFF-driven). It exposes
``data-testid="form-field-email"`` / ``form-field-password`` / ``form-submit``
once the field testIDs added during Phase 4b ship.
"""

from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile

LOGIN_EMAIL = "css=[data-testid='form-field-email']"
LOGIN_PASSWORD = "css=[data-testid='form-field-password']"
LOGIN_SUBMIT = "css=[data-testid='form-submit']"


def ui_login_mobile(
    page: Page,
    email: str,
    password: str,
    *,
    wait_for_home: bool = True,
) -> None:
    """Drive the RN login form. Optionally wait for the home tab to mount."""
    selecting_different_routes_mobile(page, "beauty_login")
    page.wait_for_timeout(1500)
    page.locator(LOGIN_EMAIL).fill(email)
    page.locator(LOGIN_PASSWORD).fill(password)
    page.locator(LOGIN_SUBMIT).click()
    page.wait_for_timeout(3000)
    if wait_for_home:
        # Home screen renders the bottom-nav. Use the URL settle as primary
        # signal, fall back to checking for the bottom nav region.
        expect(page).to_have_url(lambda url: "/home" in url)
