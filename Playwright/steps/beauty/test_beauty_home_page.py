from pytest_bdd import scenarios, given, then
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.home_page import (
    home_page_root,
    services_section,
    map_section,
    bottom_nav,
)
from Playwright.pages.pogoda.beauty.welcome_page import welcome_page_root
from Playwright.pages.pogoda.beauty.login_page import (
    email_input as login_email_input,
    password_input as login_password_input,
    submit_button as login_submit_button,
)

scenarios("../../features/Pogoda/Beauty/beauty_home_page.feature")


@given("I navigate to the beauty home page as guest")
def navigate_home_as_guest(page):
    selecting_different_routes(page, 'beauty_home')
    timeout_for_testing(page)


@given("an authenticated customer is on the beauty home page")
def authed_customer_on_home(page, test_customer):
    selecting_different_routes(page, 'beauty_login')
    page.wait_for_timeout(1500)
    page.locator(login_email_input).fill(test_customer["email"])
    page.locator(login_password_input).fill(test_customer["password"])
    page.locator(login_submit_button).click()
    page.wait_for_timeout(3000)


@then("the welcome page should be visible")
def verify_welcome_page(page):
    expect(page.locator(welcome_page_root)).to_be_visible()


@then("the beauty home page should be visible")
def verify_home_page_visible(page):
    expect(page.locator(home_page_root)).to_be_visible()


@then("the services section should be visible on the home page")
def verify_services_section(page):
    expect(page.locator(services_section)).to_be_visible()


@then("the map section should be visible on the home page")
def verify_map_section(page):
    expect(page.locator(map_section)).to_be_visible()


@then("the bottom nav should be visible on the home page")
def verify_bottom_nav(page):
    expect(page.locator(bottom_nav)).to_be_visible()
