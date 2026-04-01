import pytest
from pytest_bdd import scenarios, given, then
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.home_page import (
    home_page_root,
    brand_name_button,
    signin_button,
    signup_button,
    services_section,
    map_section,
)

scenarios("../../features/Pogoda/Beauty/beauty_home_page.feature")


@pytest.fixture

@given("I navigate to the beauty home page")
def navigate_to_beauty_home(page):
    selecting_different_routes(page, 'beauty_home')
    timeout_for_testing(page)


@then("the beauty home page should be visible")
def verify_home_page_visible(page):
    expect(page.locator(home_page_root)).to_be_visible()


@then("the beauty brand name button should be visible on the home page")
def verify_brand_name_button(page):
    expect(page.locator(brand_name_button)).to_be_visible()


@then("the sign in button should be visible on the home page")
def verify_home_signin_button(page):
    expect(page.locator(signin_button)).to_be_visible()


@then("the sign up button should be visible on the home page")
def verify_home_signup_button(page):
    expect(page.locator(signup_button)).to_be_visible()


@then("the services section should be visible on the home page")
def verify_services_section(page):
    expect(page.locator(services_section)).to_be_visible()


@then("the map section should be visible on the home page")
def verify_map_section(page):
    expect(page.locator(map_section)).to_be_visible()
