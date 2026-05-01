from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.welcome_page import (
    welcome_page_root,
    brand_block,
    signin_button as welcome_signin_button,
    signup_button as welcome_signup_button,
    google_button as welcome_google_button,
)
from Playwright.pages.pogoda.beauty.login_page import login_page_root
from Playwright.pages.pogoda.beauty.signup_page import signup_page_root

scenarios("../../features/Pogoda/Beauty/beauty_welcome_page.feature")


@given("I navigate to the beauty welcome page")
def navigate_to_welcome(page):
    selecting_different_routes(page, 'beauty_welcome')
    timeout_for_testing(page)


@then("the beauty welcome page should be visible")
def verify_welcome_visible(page):
    expect(page.locator(welcome_page_root)).to_be_visible()


@then("the welcome brand block should be visible")
def verify_brand_block(page):
    expect(page.locator(brand_block)).to_be_visible()


@then("the welcome sign in button should be visible on the welcome page")
def verify_welcome_signin_visible(page):
    expect(page.locator(welcome_signin_button)).to_be_visible()


@then("the welcome create account button should be visible")
def verify_welcome_signup_visible(page):
    expect(page.locator(welcome_signup_button)).to_be_visible()


@then("the welcome google button should be visible")
def verify_welcome_google_visible(page):
    expect(page.locator(welcome_google_button)).to_be_visible()


@when("I click the welcome sign in button")
def click_welcome_signin(page):
    page.locator(welcome_signin_button).click()
    page.wait_for_timeout(2000)


@when("I click the welcome create account button")
def click_welcome_signup(page):
    page.locator(welcome_signup_button).click()
    page.wait_for_timeout(2000)


@then("I should land on the beauty login page")
def verify_login_visible(page):
    expect(page.locator(login_page_root)).to_be_visible()


@then("I should land on the beauty signup page")
def verify_signup_visible(page):
    expect(page.locator(signup_page_root)).to_be_visible()
