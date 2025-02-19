import pytest
from pytest_bdd import scenarios, given, then, when
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.kevin.navigation_bar import *
from Playwright.pages.kevin.about_page import *
from Playwright.pages.kevin.footer_bar import *

scenarios("../features/Kevin/kevin_contact_page.feature")

@pytest.fixture
@given("I navigate to kevin home page")
def navigate_to_kevin_contact_page(page):
    selecting_different_routes(page, 'kevin')

@when("I click on the Contact link")
def click_contact_link(page):
    page.locator(contacts_button).click()
    timeout_for_testing(page)

@then("It should display the Contact Me header")
def verify_contact_me_header(page):
    expect(page.get_by_role("heading")).to_contain_text("Contact Me")

@then("It should display my email icon and address")
def verify_email_icon_and_address(page):
    expect(page.locator("#contact")).to_contain_text("kevin.ortiz.software@gmail.com")
    expect(page.get_by_role("img", name="email icon")).to_be_visible()

@then("It should display my LinkedIn icon and link")
def verify_linkedin_icon_and_link(page):
    expect(page.locator("#contact")).to_contain_text("LinkedIn")
    expect(page.get_by_role("img", name="My LinkedIn profile")).to_be_visible()