import pytest
from playwright.sync_api import Page
import datetime

@pytest.fixture(scope="function")
def homePage(page: Page):
    page.goto("http://localhost:8000")  # Replace with your Django app's URL
    yield page

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if report.when == "call" and report.failed:
        now = datetime.datetime.now()
        screenshot_path = f"failure-{now.strftime('%Y%m%d%H%M%S')}.png"
        if hasattr(item.instance, "page"):
            item.instance.page.screenshot(path=screenshot_path)
            print(f"Saved screenshot to {screenshot_path}")