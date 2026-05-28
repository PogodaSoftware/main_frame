"""Parametrized smoke for every RN screen on the native APK.

One pytest per RN route: deep-link via ``adb am start`` and assert the
page's anchor text shows up before the timeout. Anchors are the same
ones used by ``capture_screenshots.py`` — keeping a single source of
truth for "did this screen actually render".

Per-role groups share a session-scoped login (so we don't hammer the
auth endpoint 50 times). The login is performed lazily in a fixture
that runs once per role module — first parametrized test in that role
triggers it, the rest reuse the session.
"""

from __future__ import annotations

import subprocess
import time

import pytest
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from Playwright.steps.beauty_mobile_native.capture_screenshots import (
    ADB,
    APP_PACKAGE,
    APP_ACTIVITY,
    BUSINESS_PAGES,
    CUSTOMER_PAGES,
    ADMIN_PAGES,
    CRED,
    _login_admin,
    _login_business,
    _login_customer,
)


# ---------- helpers --------------------------------------------------------

def _open(route: str) -> None:
    if not route.startswith("/"):
        route = "/" + route
    subprocess.run(
        [ADB, "shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", f"beautyapp://{route}"],
        check=False, timeout=10,
    )
    time.sleep(2)


def _wait_text(driver, text: str, timeout: float = 10) -> bool:
    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located(
                (AppiumBy.XPATH, f'//*[@text="{text}"]')
            )
        )
        return True
    except Exception:
        return False


# ---------- role fixtures --------------------------------------------------

@pytest.fixture(scope="module")
def customer_session(appium_driver):
    """Reset + log in as the seeded customer for every customer test."""
    subprocess.run([ADB, "shell", "pm", "clear", APP_PACKAGE], check=False, timeout=10)
    time.sleep(1)
    subprocess.run(
        [ADB, "shell", "am", "start", "-n", f"{APP_PACKAGE}/{APP_ACTIVITY}"],
        check=False, timeout=10,
    )
    subprocess.run(
        [
            ADB, "shell", "am", "start",
            "-a", "android.intent.action.VIEW",
            "-d", "beautyapp://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081",
        ],
        check=False, timeout=10,
    )
    time.sleep(8)
    assert _login_customer(appium_driver, *CRED["customer"]), "Customer login failed"
    yield appium_driver


@pytest.fixture(scope="module")
def business_session(appium_driver):
    subprocess.run([ADB, "shell", "pm", "clear", APP_PACKAGE], check=False, timeout=10)
    time.sleep(1)
    subprocess.run(
        [ADB, "shell", "am", "start", "-n", f"{APP_PACKAGE}/{APP_ACTIVITY}"],
        check=False, timeout=10,
    )
    subprocess.run(
        [
            ADB, "shell", "am", "start",
            "-a", "android.intent.action.VIEW",
            "-d", "beautyapp://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081",
        ],
        check=False, timeout=10,
    )
    time.sleep(8)
    assert _login_business(appium_driver, *CRED["business"]), "Business login failed"
    yield appium_driver


@pytest.fixture(scope="module")
def admin_session(appium_driver):
    subprocess.run([ADB, "shell", "pm", "clear", APP_PACKAGE], check=False, timeout=10)
    time.sleep(1)
    subprocess.run(
        [ADB, "shell", "am", "start", "-n", f"{APP_PACKAGE}/{APP_ACTIVITY}"],
        check=False, timeout=10,
    )
    subprocess.run(
        [
            ADB, "shell", "am", "start",
            "-a", "android.intent.action.VIEW",
            "-d", "beautyapp://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081",
        ],
        check=False, timeout=10,
    )
    time.sleep(8)
    assert _login_admin(appium_driver, *CRED["admin"]), "Admin login failed"
    yield appium_driver


# ---------- parametrized smoke --------------------------------------------

# Auth screens render without a logged-in session — exercised in the
# customer-pre-login group so we don't double-spend Appium sessions.
PRE_LOGIN_CUSTOMER = [p for p in CUSTOMER_PAGES if p[0].startswith(("01_", "02_", "03_", "04_"))]
POST_LOGIN_CUSTOMER = [p for p in CUSTOMER_PAGES if p not in PRE_LOGIN_CUSTOMER]

PRE_LOGIN_BUSINESS = [p for p in BUSINESS_PAGES if p[0].startswith(("01_", "02_"))]
POST_LOGIN_BUSINESS = [p for p in BUSINESS_PAGES if p not in PRE_LOGIN_BUSINESS]


@pytest.mark.parametrize("name,route,anchor", PRE_LOGIN_CUSTOMER, ids=lambda v: v if isinstance(v, str) else "")
def test_customer_auth_route(name, route, anchor, appium_driver):
    _open(route)
    if anchor:
        assert _wait_text(appium_driver, anchor, timeout=10), \
            f"{name}: anchor '{anchor}' not found at {route}"


@pytest.mark.parametrize("name,route,anchor", POST_LOGIN_CUSTOMER, ids=lambda v: v if isinstance(v, str) else "")
def test_customer_route(name, route, anchor, customer_session):
    _open(route)
    if anchor:
        assert _wait_text(customer_session, anchor, timeout=10), \
            f"{name}: anchor '{anchor}' not found at {route}"


@pytest.mark.parametrize("name,route,anchor", PRE_LOGIN_BUSINESS, ids=lambda v: v if isinstance(v, str) else "")
def test_business_auth_route(name, route, anchor, appium_driver):
    _open(route)
    if anchor:
        assert _wait_text(appium_driver, anchor, timeout=10), \
            f"{name}: anchor '{anchor}' not found at {route}"


@pytest.mark.parametrize("name,route,anchor", POST_LOGIN_BUSINESS, ids=lambda v: v if isinstance(v, str) else "")
def test_business_route(name, route, anchor, business_session):
    _open(route)
    if anchor:
        assert _wait_text(business_session, anchor, timeout=10), \
            f"{name}: anchor '{anchor}' not found at {route}"


@pytest.mark.parametrize("name,route,anchor", ADMIN_PAGES, ids=lambda v: v if isinstance(v, str) else "")
def test_admin_route(name, route, anchor, admin_session):
    _open(route)
    if anchor:
        assert _wait_text(admin_session, anchor, timeout=10), \
            f"{name}: anchor '{anchor}' not found at {route}"
