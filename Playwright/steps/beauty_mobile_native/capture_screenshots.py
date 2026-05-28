"""Capture native screenshots for every RN page (customer/business/admin).

Driven by Appium UiAutomator2 against ``emulator-5554``. Reuses one driver
session per role and saves PNGs into ``docs/{role}/``.

Usage::

    python -m Playwright.steps.beauty_mobile_native.capture_screenshots <role>

Where ``<role>`` is one of ``customer``, ``business``, ``admin``, or
``all`` (default).
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from typing import Iterable

from appium import webdriver
from appium.options.android import UiAutomator2Options
from appium.webdriver.common.appiumby import AppiumBy
from appium.webdriver.webdriver import WebDriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


REPO = r"C:\Users\kevin\main_frame"
DOCS = os.path.join(REPO, "docs")
APPIUM_URL = "http://127.0.0.1:4723"
APP_PACKAGE = "com.pogodasoftware.beautyapp"
APP_ACTIVITY = ".MainActivity"
ADB = r"C:\Users\kevin\AppData\Local\Android\Sdk\platform-tools\adb.exe"

CRED = {
    "customer": ("maria@beauty.io", "Test1234!"),
    "business": ("biz-test-20260514@example.com", "Test1234!"),
    "admin": ("daniel@beauty.io", "Test1234!"),
}

# Each route: (filename, deep_link_route, anchor_text_to_wait_for_or_None)
CUSTOMER_PAGES: list[tuple[str, str, str | None]] = [
    # expo-router strips the `(group)` segment from URL paths.
    ("01_welcome",          "/welcome",                              None),
    ("02_login",            "/login",                                "Welcome back"),
    ("03_signup",           "/signup",                               None),
    ("04_forgot",           "/forgot",                               None),
    # post-login
    ("10_home",             "/home",                                 "Services"),
    ("11_search",           "/search",                               None),
    ("12_category_facial",  "/category/Facial",                      None),
    ("13_provider_2",       "/provider/2",                           None),
    ("14_service_1",        "/service/1",                            None),
    ("15_favorites",        "/favorites",                            None),
    ("16_profile",          "/profile",                              "maria@beauty.io"),
    ("17_book_1",           "/book/1",                               "CHOOSE A DAY"),
    ("18_bookings",         "/bookings",                             "Bookings"),
    ("19_booking_108",      "/bookings/108",                         "Booking"),
    ("20_reschedule_108",   "/bookings/108/reschedule",              "Reschedule"),
    ("21_review_108",       "/bookings/108/review",                  "Leave a review"),
    ("22_success_108",      "/bookings/108/success",                 "Booking confirmed"),
    ("23_chats",            "/chats",                                "Messages"),
    ("24_chat_108",         "/chats/108",                            None),
]

BUSINESS_PAGES: list[tuple[str, str, str | None]] = [
    ("01_business_login",       "/business-login",                  "Business Sign In"),
    ("02_business_signup",      "/business-signup",                 None),
    ("10_home",                 "/business/home",                   "BUSINESS PORTAL"),
    ("11_profile",              "/business/profile",                None),
    ("12_services",             "/business/services",               "Services"),
    ("13_service_form_1",       "/business/services/1",             None),
    ("14_apply_entity",         "/business/apply/entity",           None),
    ("15_apply_services",       "/business/apply/services",         None),
    ("16_apply_stripe",         "/business/apply/stripe",           None),
    ("17_apply_schedule",       "/business/apply/schedule",         None),
    ("18_apply_tools",          "/business/apply/tools",            None),
    ("19_apply_review",         "/business/apply/review",           None),
    ("20_availability",         "/business/availability",           "Weekly hours"),
    ("21_bookings",             "/business/bookings",               "Bookings"),
    ("22_reviews",              "/business/reviews",                None),
    ("23_settings",             "/business/settings",               "Settings"),
    ("24_settings_contact",     "/business/settings/contact",       None),
    ("25_settings_password",    "/business/settings/password",      None),
]

ADMIN_PAGES: list[tuple[str, str, str | None]] = [
    ("01_signin",           "/admin/portal/signin",                 "ADMIN SIGN-IN"),
    ("02_2fa",              "/admin/portal/2fa",                    "STEP 2 OF 2"),
    ("03_magic",            "/admin/portal/magic",                  None),
    ("04_ip_warning",       "/admin/portal/ip-warning",             None),
    ("10_dashboard",        "/admin/portal/dashboard",              "OVERVIEW"),
    ("11_dashboard_v2",     "/admin/portal/dashboard/v2",           None),
    ("20_crm",              "/admin/portal/crm",                    "Customers"),
    ("21_crm_tags",         "/admin/portal/crm/tags",               "Manage tags"),
    ("22_crm_customer_1",   "/admin/portal/crm/customer/1",         "ACCOUNT ID"),
    ("23_crm_provider_2",   "/admin/portal/crm/provider/2",         None),
    ("24_crm_suspend",      "/admin/portal/crm/suspend/customer/1", "Suspend"),
    ("30_bookings",         "/admin/portal/bookings",               "Bookings ledger"),
    ("31_tickets",          "/admin/portal/tickets",                "Support tickets"),
    ("32_team",             "/admin/portal/team",                   "Admin team"),
    ("33_audit",            "/admin/portal/audit",                  "Audit log"),
]


def _adb(*args: str, timeout: float = 10) -> None:
    subprocess.run([ADB, *args], check=False, timeout=timeout)


def _adb_type(text: str) -> None:
    """Use ADB ``input text`` (more reliable than Appium send_keys on RN
    controlled ``TextInput``s).

    Spaces must be escaped as ``%s`` and the whole string quoted.
    """
    safe = text.replace(" ", "%s")
    _adb("shell", "input", "text", safe)


def _adb_tap(el) -> None:
    """Tap an element's center via adb (avoids Appium click-event quirks)."""
    rect = el.rect
    cx = int(rect["x"] + rect["width"] / 2)
    cy = int(rect["y"] + rect["height"] / 2)
    _adb("shell", "input", "tap", str(cx), str(cy))


def _open(driver: WebDriver, route: str) -> None:
    _adb("shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", f"beautyapp://{route}")
    time.sleep(2.5)


def _wait_text(driver: WebDriver, text: str, timeout: float = 12) -> bool:
    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located(
                (AppiumBy.XPATH, f'//*[@text="{text}"]')
            )
        )
        return True
    except Exception:
        return False


def _screencap(dest: str) -> None:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    _adb("shell", "screencap", "-p", "/sdcard/_shot.png")
    _adb("pull", "/sdcard/_shot.png", dest)


def _make_driver() -> WebDriver:
    opts = UiAutomator2Options().load_capabilities({
        "platformName": "Android",
        "appium:automationName": "UiAutomator2",
        "appium:deviceName": "emulator-5554",
        "appium:udid": "emulator-5554",
        "appium:appPackage": APP_PACKAGE,
        "appium:appActivity": APP_ACTIVITY,
        "appium:noReset": True,
        "appium:newCommandTimeout": 240,
    })
    return webdriver.Remote(APPIUM_URL, options=opts)


def _clear_and_relaunch() -> None:
    _adb("shell", "pm", "clear", APP_PACKAGE)
    time.sleep(1)
    _adb("shell", "am", "start", "-n", f"{APP_PACKAGE}/{APP_ACTIVITY}")
    # Set Metro URL via dev-client deep link.
    _adb(
        "shell", "am", "start",
        "-a", "android.intent.action.VIEW",
        "-d", "beautyapp://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081",
    )
    time.sleep(8)


def _login_customer(driver: WebDriver, email: str, password: str) -> bool:
    _open(driver, "/login")
    _wait_text(driver, "Welcome back", timeout=20)
    email_el = driver.find_element(AppiumBy.XPATH, '//android.widget.EditText[@text="Enter your email"]')
    _adb_tap(email_el); time.sleep(0.3); _adb_type(email)
    pw_el = driver.find_element(AppiumBy.XPATH, '//android.widget.EditText[@text="Enter your password"]')
    _adb_tap(pw_el); time.sleep(0.3); _adb_type(password)
    _adb("shell", "input", "keyevent", "111")  # ESC closes the soft keyboard
    time.sleep(0.4)
    signins = driver.find_elements(AppiumBy.XPATH, '//*[@text="Sign in"]')
    if not signins:
        return False
    _adb_tap(signins[0])
    return _wait_text(driver, "Services", timeout=25)


def _login_business(driver: WebDriver, email: str, password: str) -> bool:
    _open(driver, "/login")
    _wait_text(driver, "Welcome back", timeout=20)
    # Tap second "Sign in" link (Business provider) — last visible matches.
    links = driver.find_elements(AppiumBy.XPATH, '//*[@text="Sign in"]')
    _adb_tap(links[-1])
    _wait_text(driver, "Business Sign In", timeout=10)
    email_el = driver.find_element(AppiumBy.XPATH, '//android.widget.EditText[@text="Enter your business email"]')
    _adb_tap(email_el); time.sleep(0.3); _adb_type(email)
    pw_el = driver.find_element(AppiumBy.XPATH, '//android.widget.EditText[@text="Enter your password"]')
    _adb_tap(pw_el); time.sleep(0.3); _adb_type(password)
    _adb("shell", "input", "keyevent", "111")
    time.sleep(0.4)
    signins = driver.find_elements(AppiumBy.XPATH, '//*[@text="Sign in"]')
    if not signins:
        return False
    _adb_tap(signins[0])
    return _wait_text(driver, "BUSINESS PORTAL", timeout=25)


def _login_admin(driver: WebDriver, email: str, password: str) -> bool:
    # After ``pm clear``, the deep-link can race the app's first render. Retry
    # a couple of times until the admin signin actually loads.
    for _ in range(4):
        _open(driver, "/admin/portal/signin")
        if _wait_text(driver, "ADMIN SIGN-IN", timeout=8):
            break
    else:
        return False
    email_el = driver.find_element(AppiumBy.XPATH, '//android.widget.EditText[@text="you@beauty.io"]')
    _adb_tap(email_el); time.sleep(0.3); _adb_type(email)
    pw_inputs = driver.find_elements(AppiumBy.CLASS_NAME, "android.widget.EditText")
    _adb_tap(pw_inputs[1]); time.sleep(0.3); _adb_type(password)
    _adb("shell", "input", "keyevent", "111")
    time.sleep(0.4)
    btn = driver.find_element(AppiumBy.XPATH, '//*[@text="Continue →"]')
    _adb_tap(btn)
    # Reaching the 2FA step confirms the password POST succeeded → session set.
    return _wait_text(driver, "STEP 2 OF 2", timeout=20)


def _capture_pages(driver: WebDriver, role: str, pages: Iterable[tuple[str, str, str | None]]) -> list[str]:
    results: list[str] = []
    for name, route, anchor in pages:
        dest = os.path.join(DOCS, role, f"{name}.png")
        _open(driver, route)
        if anchor:
            ok = _wait_text(driver, anchor, timeout=8)
        else:
            time.sleep(2)
            ok = True
        _screencap(dest)
        status = "OK" if ok else "no-anchor"
        results.append(f"{role}/{name}.png — {status} ({route})")
        # Pace to avoid 120/min throttle.
        time.sleep(0.6)
    return results


def run_customer() -> list[str]:
    _clear_and_relaunch()
    driver = _make_driver()
    try:
        # Pre-login captures (auth screens).
        pre = [p for p in CUSTOMER_PAGES if p[0].startswith(("01_", "02_", "03_", "04_"))]
        results = _capture_pages(driver, "customer", pre)
        # Login + post-login captures.
        if not _login_customer(driver, *CRED["customer"]):
            results.append("customer/_login — FAILED")
            return results
        post = [p for p in CUSTOMER_PAGES if not p[0].startswith(("01_", "02_", "03_", "04_"))]
        results.extend(_capture_pages(driver, "customer", post))
        return results
    finally:
        driver.quit()


def run_business() -> list[str]:
    _clear_and_relaunch()
    driver = _make_driver()
    try:
        # Pre-login: business signin/signup screens.
        pre = [p for p in BUSINESS_PAGES if p[0].startswith(("01_", "02_"))]
        # business-login screen reached via deep-link.
        results = _capture_pages(driver, "provider", pre)
        if not _login_business(driver, *CRED["business"]):
            results.append("provider/_login — FAILED")
            return results
        post = [p for p in BUSINESS_PAGES if not p[0].startswith(("01_", "02_"))]
        results.extend(_capture_pages(driver, "provider", post))
        return results
    finally:
        driver.quit()


def run_admin() -> list[str]:
    _clear_and_relaunch()
    driver = _make_driver()
    try:
        if not _login_admin(driver, *CRED["admin"]):
            return ["admin/_login — FAILED"]
        results = _capture_pages(driver, "admin", ADMIN_PAGES)
        return results
    finally:
        driver.quit()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("role", nargs="?", default="all", choices=["customer", "business", "admin", "all"])
    args = ap.parse_args()

    all_results: list[str] = []
    if args.role in ("customer", "all"):
        all_results += run_customer()
    if args.role in ("business", "all"):
        all_results += run_business()
    if args.role in ("admin", "all"):
        all_results += run_admin()

    print("\n=== RESULTS ===")
    for r in all_results:
        print(r)
    fails = [r for r in all_results if "FAILED" in r or "no-anchor" in r]
    if fails:
        print(f"\n{len(fails)} issue(s)")
        return 1
    print("\nAll pages captured.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
