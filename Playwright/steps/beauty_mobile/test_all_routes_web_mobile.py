"""Parametrized smoke for every RN screen on the Expo web bundle.

One pytest per RN route: ``page.goto`` to the served URL and assert the
page's anchor text shows up before the timeout. The route + anchor list
is imported from the native capture module so web/native stay in sync.

Auth screens render without a logged-in session; post-login routes share
a module-scoped login via the existing ``ui_login_mobile`` helper.
"""

from __future__ import annotations

import os
import pytest
from playwright.sync_api import sync_playwright, Page, expect

from Playwright.steps.beauty_mobile_native.capture_screenshots import (
    BUSINESS_PAGES,
    CUSTOMER_PAGES,
    ADMIN_PAGES,
    CRED,
)


MOBILE_BASE = f"http://{os.getenv('BEAUTY_MOBILE_HOST', 'localhost')}:{os.getenv('BEAUTY_MOBILE_PORT', '8081')}"


# ---------- helpers --------------------------------------------------------

def _url(route: str) -> str:
    if not route.startswith("/"):
        route = "/" + route
    return f"{MOBILE_BASE}{route}"


def _login_customer(page: Page, email: str, password: str) -> None:
    page.goto(_url("/login"))
    page.wait_for_timeout(1500)
    page.locator("[data-testid='form-field-email']").fill(email)
    page.locator("[data-testid='form-field-password']").fill(password)
    page.locator("[data-testid='form-submit']").click()
    page.wait_for_timeout(3000)


def _login_business(page: Page, email: str, password: str) -> None:
    page.goto(_url("/business-login"))
    page.wait_for_timeout(1500)
    page.locator("[data-testid='form-field-email']").fill(email)
    page.locator("[data-testid='form-field-password']").fill(password)
    page.locator("[data-testid='form-submit']").click()
    page.wait_for_timeout(3000)


def _login_admin(page: Page, email: str, password: str) -> None:
    page.goto(_url("/admin/portal/signin"))
    page.wait_for_timeout(1500)
    # Admin signin uses native input elements (not the BFF FormRenderer testIDs).
    inputs = page.locator("input")
    inputs.nth(0).fill(email)
    inputs.nth(1).fill(password)
    page.get_by_text("Continue →").click()
    page.wait_for_timeout(3000)


# ---------- session fixtures ----------------------------------------------

@pytest.fixture(scope="module")
def browser_ctx():
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(viewport={"width": 412, "height": 915})
        yield ctx
        ctx.close()
        browser.close()


@pytest.fixture(scope="module")
def customer_page(browser_ctx):
    page = browser_ctx.new_page()
    _login_customer(page, *CRED["customer"])
    yield page
    page.close()


@pytest.fixture(scope="module")
def business_page(browser_ctx):
    page = browser_ctx.new_page()
    _login_business(page, *CRED["business"])
    yield page
    page.close()


@pytest.fixture(scope="module")
def admin_page(browser_ctx):
    page = browser_ctx.new_page()
    _login_admin(page, *CRED["admin"])
    yield page
    page.close()


@pytest.fixture(scope="function")
def anon_page(browser_ctx):
    page = browser_ctx.new_page()
    yield page
    page.close()


# ---------- groups --------------------------------------------------------

PRE_LOGIN_CUSTOMER = [p for p in CUSTOMER_PAGES if p[0].startswith(("01_", "02_", "03_", "04_"))]
POST_LOGIN_CUSTOMER = [p for p in CUSTOMER_PAGES if p not in PRE_LOGIN_CUSTOMER]

PRE_LOGIN_BUSINESS = [p for p in BUSINESS_PAGES if p[0].startswith(("01_", "02_"))]
POST_LOGIN_BUSINESS = [p for p in BUSINESS_PAGES if p not in PRE_LOGIN_BUSINESS]


def _assert_anchor(page: Page, anchor: str | None, *, timeout: int = 5000) -> None:
    if anchor:
        expect(page.get_by_text(anchor).first).to_be_visible(timeout=timeout)


# ---------- tests ---------------------------------------------------------

@pytest.mark.parametrize("name,route,anchor", PRE_LOGIN_CUSTOMER, ids=lambda v: v if isinstance(v, str) else "")
def test_customer_auth_route(anon_page, name, route, anchor):
    anon_page.goto(_url(route))
    anon_page.wait_for_timeout(1500)
    _assert_anchor(anon_page, anchor)


@pytest.mark.parametrize("name,route,anchor", POST_LOGIN_CUSTOMER, ids=lambda v: v if isinstance(v, str) else "")
def test_customer_route(customer_page, name, route, anchor):
    customer_page.goto(_url(route))
    customer_page.wait_for_timeout(1500)
    _assert_anchor(customer_page, anchor)


@pytest.mark.parametrize("name,route,anchor", PRE_LOGIN_BUSINESS, ids=lambda v: v if isinstance(v, str) else "")
def test_business_auth_route(anon_page, name, route, anchor):
    anon_page.goto(_url(route))
    anon_page.wait_for_timeout(1500)
    _assert_anchor(anon_page, anchor)


@pytest.mark.parametrize("name,route,anchor", POST_LOGIN_BUSINESS, ids=lambda v: v if isinstance(v, str) else "")
def test_business_route(business_page, name, route, anchor):
    business_page.goto(_url(route))
    business_page.wait_for_timeout(1500)
    _assert_anchor(business_page, anchor)


@pytest.mark.parametrize("name,route,anchor", ADMIN_PAGES, ids=lambda v: v if isinstance(v, str) else "")
def test_admin_route(admin_page, name, route, anchor):
    admin_page.goto(_url(route))
    admin_page.wait_for_timeout(1500)
    _assert_anchor(admin_page, anchor)
