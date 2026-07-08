"""Base page-object utilities for native Appium tests.

Page objects in this package wrap a UiAutomator2-driven Appium session
and expose intent-named methods (``open``, ``has_<thing>``, ``tap_<thing>``)
so tests stay declarative.
"""

from __future__ import annotations

import time

from appium.webdriver.common.appiumby import AppiumBy
from appium.webdriver.webdriver import WebDriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class NativeBasePage:
    """Shared helpers for every native page object."""

    def __init__(self, driver: WebDriver):
        self.driver = driver

    # --------- locators (low-level) -------------------------------------

    @staticmethod
    def by_text(text: str) -> tuple[str, str]:
        return (AppiumBy.XPATH, f'//*[@text="{text}"]')

    @staticmethod
    def by_contains(text: str) -> tuple[str, str]:
        return (AppiumBy.XPATH, f'//*[contains(@text,"{text}")]')

    @staticmethod
    def by_desc(desc: str) -> tuple[str, str]:
        return (AppiumBy.ACCESSIBILITY_ID, desc)

    # --------- waits ----------------------------------------------------

    def wait_visible(self, locator: tuple[str, str], timeout: float = 10):
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located(locator)
        )

    def wait_clickable(self, locator: tuple[str, str], timeout: float = 10):
        return WebDriverWait(self.driver, timeout).until(
            EC.element_to_be_clickable(locator)
        )

    def has_text(self, text: str, timeout: float = 5) -> bool:
        try:
            self.wait_visible(self.by_text(text), timeout=timeout)
            return True
        except Exception:
            return False

    # --------- nav ------------------------------------------------------

    def deep_link(self, route: str) -> None:
        """Open ``beautyapp:///<route>`` via ADB intent."""
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

    def tap_text(self, text: str, timeout: float = 5) -> None:
        self.wait_clickable(self.by_text(text), timeout=timeout).click()

    # --------- screenshot ----------------------------------------------

    def screenshot(self, dest: str) -> None:
        import os
        import subprocess

        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if not self.driver.save_screenshot(dest):
            subprocess.run(
                ["adb", "shell", "screencap", "-p", "/sdcard/_native_shot.png"],
                check=False, timeout=10,
            )
            subprocess.run(
                ["adb", "pull", "/sdcard/_native_shot.png", dest],
                check=False, timeout=10,
            )
