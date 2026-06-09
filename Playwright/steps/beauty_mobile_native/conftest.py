"""Pytest config for the native Appium suite (beautyAppMobile on emulator-5554).

Mirrors ``Playwright/steps/beauty_mobile/conftest.py`` but the driver is
Appium UiAutomator2 instead of Playwright/Chromium. The backend, test-user
factories and `BACKEND_URL` constant are reused from the canonical
``Playwright/steps/beauty/`` suite — same DB rows can be exercised from web,
RN-web and native without forking the fixtures.

Prerequisites checked once per session (auto-skipped if anything missing):
- Appium server reachable at ``http://127.0.0.1:4723``.
- ``adb devices`` lists ``emulator-5554`` in ``device`` state.
- App package ``com.pogodasoftware.beautyapp`` already installed.

Throttle note: the emulator hits the backend through its NAT IP (not
``localhost``), so it is NOT exempt from the 120/min ``anon`` rate-limit.
Tests reuse a single session per role where possible; the
``_throttle_pause`` fixture below adds a small inter-test delay so the
sliding window has time to drain on long suites.
"""

from __future__ import annotations

import os
import socket
import subprocess
import time
import uuid

import pytest
import requests

from Playwright.steps.beauty.beauty_utils import BACKEND_URL, delete_test_users


# ---------- env -------------------------------------------------------------

APPIUM_URL = os.getenv("APPIUM_URL", "http://127.0.0.1:4723")
APP_PACKAGE = os.getenv("BEAUTY_APP_PACKAGE", "com.pogodasoftware.beautyapp")
APP_ACTIVITY = os.getenv("BEAUTY_APP_ACTIVITY", ".MainActivity")
DEVICE_NAME = os.getenv("BEAUTY_DEVICE", "emulator-5554")
ADB = os.getenv("ADB", r"C:\Users\kevin\AppData\Local\Android\Sdk\platform-tools\adb.exe")


# ---------- pre-flight ------------------------------------------------------

def _port_open(host: str, port: int, timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _emulator_online() -> bool:
    try:
        out = subprocess.check_output([ADB, "devices"], timeout=5, text=True)
    except Exception:
        return False
    return any(
        line.startswith(DEVICE_NAME) and "device" in line.split()
        for line in out.splitlines()
    )


def _app_installed() -> bool:
    try:
        out = subprocess.check_output(
            [ADB, "-s", DEVICE_NAME, "shell", "pm", "list", "packages", APP_PACKAGE],
            timeout=5, text=True,
        )
    except Exception:
        return False
    return APP_PACKAGE in out


@pytest.fixture(scope="session", autouse=True)
def _require_native_stack():
    """Skip the whole native suite if Appium / emulator / APK is missing."""
    if not _port_open("127.0.0.1", 4723):
        pytest.skip(
            "Appium server unreachable at 127.0.0.1:4723. "
            "Start with `appium` after `appium driver install uiautomator2`."
        )
    if not _emulator_online():
        pytest.skip(
            f"{DEVICE_NAME} not online. Launch the AVD from Android Studio."
        )
    if not _app_installed():
        pytest.skip(
            f"{APP_PACKAGE} not installed on {DEVICE_NAME}. "
            "Build + install with `bun run android` in Frontend/beautyAppMobile."
        )


# ---------- driver ----------------------------------------------------------

def _build_capabilities(no_reset: bool = True) -> dict:
    return {
        "platformName": "Android",
        "appium:automationName": "UiAutomator2",
        "appium:deviceName": DEVICE_NAME,
        "appium:udid": DEVICE_NAME,
        "appium:appPackage": APP_PACKAGE,
        "appium:appActivity": APP_ACTIVITY,
        "appium:noReset": no_reset,
        "appium:newCommandTimeout": 180,
        "appium:autoGrantPermissions": True,
    }


@pytest.fixture(scope="session")
def appium_driver():
    """Session-scoped Appium session.

    Heavy to set up (~10–15s) so we reuse it across tests. Individual tests
    reset navigation state by force-stopping + re-launching the app rather
    than tearing down the driver.
    """
    from appium import webdriver
    from appium.options.android import UiAutomator2Options

    options = UiAutomator2Options().load_capabilities(_build_capabilities(no_reset=True))
    driver = webdriver.Remote(APPIUM_URL, options=options)
    driver.implicitly_wait(5)
    yield driver
    try:
        driver.quit()
    except Exception:
        pass


@pytest.fixture(scope="function")
def driver(appium_driver):
    """Function-scoped alias that resets app state between tests.

    Force-stops then relaunches the package so each test starts on the
    initial route (login screen if no session, role home otherwise).
    """
    subprocess.run(
        [ADB, "-s", DEVICE_NAME, "shell", "am", "force-stop", APP_PACKAGE],
        check=False, timeout=10,
    )
    appium_driver.activate_app(APP_PACKAGE)
    time.sleep(2)
    yield appium_driver


@pytest.fixture(autouse=True)
def _throttle_pause(request):
    """Tiny delay between tests so the 120/min anon throttle drains.

    Skipped on the first test of a session.
    """
    yield
    time.sleep(0.5)


# ---------- shared test users (reuse web factories) ------------------------

@pytest.fixture(scope="function")
def test_customer():
    email = f"test_customer_native_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "TestPass123!"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": email, "password": password},
        timeout=10,
    )
    assert resp.status_code == 201, f"Setup: signup failed: {resp.text}"
    yield {"email": email, "password": password}
    delete_test_users(email)


@pytest.fixture(scope="function")
def test_business():
    email = f"test_business_native_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "TestPass123!"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={
            "email": email,
            "password": password,
            "business_name": "Native Mobile Test Studio",
        },
        timeout=10,
    )
    assert resp.status_code == 201, f"Setup: business signup failed: {resp.text}"
    yield {"email": email, "password": password, "business_name": "Native Mobile Test Studio"}
    delete_test_users(email)
