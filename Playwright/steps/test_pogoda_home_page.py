import os
import pytest
from pytest_bdd import scenarios, given, then, parsers
from playwright.sync_api import sync_playwright, expect
from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.pogoda.home_page import home_page_paragraph_xpath

scenarios("../features/pogoda/pogoda_home_page.feature")

@pytest.fixture


@given("I navigate to pogoda home page")
def navigate_to_pogoda_home_page(page):
    selecting_different_routes(page, 'pogoda')

@then(parsers.parse('it should display the text "{text}"'))
def verify_text(page, text):
    locator = page.locator(home_page_paragraph_xpath)
    expect(locator).to_have_text(text)
