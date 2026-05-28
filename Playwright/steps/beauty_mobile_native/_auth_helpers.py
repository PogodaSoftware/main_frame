"""UI login helpers for the native Appium suite.

Mirrors ``Playwright/steps/beauty_mobile/_auth_helpers.py`` but drives the
real APK on ``emulator-5554`` via Appium / UiAutomator2 selectors instead
of the RN-web build.

The RN ``TextInput`` exposes its `placeholder` as the element's `text`
attribute on Android; we lean on those + the visible button labels
("Sign in", "Continue →") for stable locators that don't require shipping
testID changes for native.
"""

from __future__ import annotations

import time
from typing import Literal

from appium.webdriver.common.appiumby import AppiumBy
from appium.webdriver.webdriver import WebDriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


Role = Literal["customer", "business", "admin"]


def _by_text(text: str) -> tuple[str, str]:
    return (AppiumBy.XPATH, f'//*[@text="{text}"]')


def _wait(driver: WebDriver, locator: tuple[str, str], timeout: float = 10):
    return WebDriverWait(driver, timeout).until(EC.presence_of_element_located(locator))


def _wait_clickable(driver: WebDriver, locator: tuple[str, str], timeout: float = 10):
    return WebDriverWait(driver, timeout).until(EC.element_to_be_clickable(locator))


def _edittext_by_placeholder(driver: WebDriver, placeholder: str, timeout: float = 10):
    """Locate an EditText whose hint (placeholder) matches.

    UiAutomator2 surfaces the React Native ``placeholder`` as the node's
    ``text`` attribute when empty, so an XPath on ``@text`` works.
    """
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located(
            (AppiumBy.XPATH, f'//android.widget.EditText[@text="{placeholder}"]')
        )
    )


# ---------- Customer / business login -------------------------------------

def ui_login_native(
    driver: WebDriver,
    email: str,
    password: str,
    *,
    role: Role = "customer",
    wait_for_home: bool = True,
) -> None:
    """Drive the RN login form on the real APK.

    For ``role="business"`` taps the ``Business provider? Sign in`` link
    first; for ``role="admin"`` use :func:`ui_login_admin_native`.
    """
    if role == "admin":
        raise ValueError("Use ui_login_admin_native() for admin signin.")

    # Wait for the customer login screen ("Welcome back" header).
    _wait(driver, _by_text("Welcome back"), timeout=15)

    if role == "business":
        # Tap second "Sign in" link (Business provider link, footer).
        signins = driver.find_elements(*_by_text("Sign in"))
        # The second visible "Sign in" is the business-provider link.
        if len(signins) < 2:
            raise AssertionError("Business provider link not found on login screen.")
        signins[-1].click()
        _wait(driver, _by_text("Business Sign In"), timeout=10)
        email_field = _edittext_by_placeholder(driver, "Enter your business email")
    else:
        email_field = _edittext_by_placeholder(driver, "Enter your email")

    email_field.click()
    email_field.send_keys(email)

    pw_field = _edittext_by_placeholder(driver, "Enter your password")
    pw_field.click()
    pw_field.send_keys(password)

    # Close soft keyboard so the Sign in button is not obscured.
    driver.hide_keyboard()

    _wait_clickable(driver, _by_text("Sign in"), timeout=5).click()

    if wait_for_home:
        # Customer lands on the home tab (carousel header "Services").
        # Business lands on the business dashboard (header text "BUSINESS PORTAL").
        anchor = "Services" if role == "customer" else "BUSINESS PORTAL"
        _wait(driver, _by_text(anchor), timeout=20)


# ---------- Admin signin --------------------------------------------------

def ui_login_admin_native(
    driver: WebDriver,
    email: str,
    password: str,
    *,
    wait_for_2fa: bool = True,
) -> None:
    """Drive the admin signin form on the real APK.

    Reaches the admin signin via deep-link (no in-app link), submits, and
    optionally waits for the 2FA screen header. (The 2FA *verify* endpoint
    is not implemented server-side yet — the password POST is enough to
    set the session for downstream admin screens.)
    """
    import subprocess

    # Deep-link into the admin signin screen.
    subprocess.run(
        [
            "adb", "shell", "am", "start",
            "-a", "android.intent.action.VIEW",
            "-d", "beautyapp:///admin/portal/signin",
        ],
        check=False, timeout=10,
    )
    time.sleep(2)

    _wait(driver, _by_text("ADMIN SIGN-IN"), timeout=15)

    email_field = _edittext_by_placeholder(driver, "you@beauty.io")
    email_field.click()
    email_field.send_keys(email)

    pw_field = driver.find_elements(AppiumBy.XPATH, "//android.widget.EditText")[1]
    pw_field.click()
    pw_field.send_keys(password)

    driver.hide_keyboard()

    _wait_clickable(driver, _by_text("Continue →"), timeout=5).click()

    if wait_for_2fa:
        _wait(driver, _by_text("STEP 2 OF 2"), timeout=20)


# ---------- Navigation helper --------------------------------------------

def deep_link(driver: WebDriver, route: str) -> None:
    """Open ``beautyapp:///<route>`` via ADB intent.

    Re-uses the running driver/session — only the foreground route changes.
    """
    import subprocess

    if not route.startswith("/"):
        route = "/" + route
    subprocess.run(
        [
            "adb", "shell", "am", "start",
            "-a", "android.intent.action.VIEW",
            "-d", f"beautyapp://{route}",
        ],
        check=False, timeout=10,
    )
    time.sleep(2)


def screenshot_to(driver: WebDriver, dest: str) -> None:
    """Save the current native screen to ``dest`` (PNG).

    Falls back to ``adb shell screencap`` if the Appium snapshot fails.
    """
    import os
    import subprocess

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if driver.save_screenshot(dest):
        return
    # Fallback via adb.
    subprocess.run(
        ["adb", "shell", "screencap", "-p", "/sdcard/_native_shot.png"],
        check=False, timeout=10,
    )
    subprocess.run(
        ["adb", "pull", "/sdcard/_native_shot.png", dest],
        check=False, timeout=10,
    )
