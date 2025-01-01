import pytest
from pytest_bdd import scenarios, given, when, then, parsers
from playwright.sync_api import Page, expect


scenarios("../features/home_page.feature")

@pytest.fixture(scope="function")
def home_page(page: Page):
    yield page

@given(parsers.cfparse('I navigate to the home page "{url}"'))
def navigate_to_home_page(home_page, url):
    home_page.goto(url)

@when(parsers.cfparse('I check the element with XPath "{xpath}"'))
def check_element(home_page, xpath):
    home_page.locator(xpath)

@then(parsers.cfparse('it should display the text "{expected_text}"'))
def verify_text(home_page, xpath, expected_text):
    locator = home_page.locator(xpath)
    expect(locator).to_have_text(expected_text)
