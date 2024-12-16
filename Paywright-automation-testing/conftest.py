import pytest
from playwright.sync_api import Page
import datetime

@pytest.fixture(scope="function")
def homePage(page: Page):
    page.goto("https://80")
    yield page
    
@pytest.hookimplicit(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if report.when == "call":
        if report.failed:
            now = datetime.datetime.now()
            item.instance.save_screenshot(f"failure-{now.strftime('%Y%m%d%H%M%S')}.png")