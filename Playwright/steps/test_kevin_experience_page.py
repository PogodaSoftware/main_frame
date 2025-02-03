import pytest
from pytest_bdd import scenarios, given, when, then, parsers
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.kevin.navigation_bar import *

# Load scenarios from the feature file
scenarios("../features/Kevin/kevin_experience_page.feature")

@pytest.fixture
@given("I navigate to kevin home page")
def navigate_to_kevin_home_page(page):
    selecting_different_routes(page, 'kevin')

@when("I click on the Experience link")
def click_experience_link(page):
    page.locator(experience_button).click()

@then(parsers.parse('it should display the Experience header "{header}"'))
def verify_experience_header(page, header):
    expect(page.locator("h1")).to_contain_text(header)

@then(parsers.parse('it should display the category "{category}"'))
def verify_category(page, category):
    expect(page.locator("app-home")).to_contain_text(category)

@then(parsers.parse('it should display the skill "{skill}"'))
def verify_skill(page, skill):
    expect(page.locator("app-home")).to_contain_text(skill)