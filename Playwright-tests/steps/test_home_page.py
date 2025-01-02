import pytest
from pytest_bdd import scenarios, given, then, parsers
from playwright.sync_api import sync_playwright, expect

# Load the feature file
scenarios("../features/home_page.feature")

# Fixture to manage Playwright context and browser
@pytest.fixture
def page():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        yield page
        browser.close()

@given("I navigate to the home page")
def navigate_to_home_page(page):
    page.goto("http://localhost:80/kevin")

@then(parsers.parse('it should display the text "{text}"'))
def verify_text(page, text):
    locator = page.locator("xpath=/html/body/app-root/app-home/p")
    expect(locator).to_have_text(text)