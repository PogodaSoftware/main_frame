import os
import pytest
from pytest_bdd import scenarios, given, then, parsers
from playwright.sync_api import sync_playwright, expect
from Playwright.pages.pogoda.home_page import home_page_paragraph_xpath

scenarios("../features/pogoda_home_page.feature")

@pytest.fixture
def page():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        yield page
        browser.close()

@given("I navigate to pogoda home page")
def navigate_to_pogoda_home_page(page):
    frontend_port = os.getenv('FRONTEND_PORT')
    if not frontend_port:
        raise ValueError("FRONTEND_PORT environment variable is not set")
    page.goto(f"http://localhost:{frontend_port}/pogoda")


@then(parsers.parse('it should display the text "{text}"'))
def verify_text(page, text):
    locator = page.locator(home_page_paragraph_xpath)
    expect(locator).to_have_text(text) 