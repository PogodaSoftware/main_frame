import pytest
from pytest_bdd import scenarios, given, then, parsers
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.signup_page import (
    signup_page_root,
    signup_title,
    email_input,
    password_input,
    password_toggle_button,
    submit_button,
    signin_link_button,
)

scenarios("../../features/Pogoda/Beauty/beauty_signup_page.feature")


@pytest.fixture

@given("I navigate to the beauty signup page")
def navigate_to_beauty_signup(page):
    selecting_different_routes(page, 'beauty_signup')
    timeout_for_testing(page)


@then("the beauty signup page should be visible")
def verify_signup_page_visible(page):
    expect(page.locator(signup_page_root)).to_be_visible()


@then(parsers.parse('the signup title should display "{title}"'))
def verify_signup_title(page, title):
    expect(page.locator(signup_title)).to_have_text(title)


@then("the signup email input field should be visible")
def verify_signup_email_input(page):
    expect(page.locator(email_input)).to_be_visible()


@then("the signup password input field should be visible")
def verify_signup_password_input(page):
    expect(page.locator(password_input)).to_be_visible()


@then("the signup password toggle button should be visible")
def verify_signup_password_toggle(page):
    expect(page.locator(password_toggle_button)).to_be_visible()


@then("the continue submit button should be visible")
def verify_continue_button(page):
    expect(page.locator(submit_button)).to_be_visible()


@then("the sign in navigation link should be visible on the signup page")
def verify_signin_nav_link_on_signup(page):
    expect(page.locator(signin_link_button)).to_be_visible()
