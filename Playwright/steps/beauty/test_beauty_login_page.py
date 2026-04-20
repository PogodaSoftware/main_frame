import pytest
from pytest_bdd import scenarios, given, then, parsers
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.login_page import (
    login_page_root,
    login_title,
    login_subtitle,
    email_input,
    password_input,
    password_toggle_button,
    submit_button,
    signup_link_button,
    business_login_link_button,
)

scenarios("../../features/Pogoda/Beauty/beauty_login_page.feature")


@pytest.fixture

@given("I navigate to the beauty login page")
def navigate_to_beauty_login(page):
    selecting_different_routes(page, 'beauty_login')
    timeout_for_testing(page)


@then("the beauty login page should be visible")
def verify_login_page_visible(page):
    expect(page.locator(login_page_root)).to_be_visible()


@then(parsers.parse('the login title should display "{title}"'))
def verify_login_title(page, title):
    expect(page.locator(login_title)).to_have_text(title)


@then(parsers.parse('the login subtitle should display "{subtitle}"'))
def verify_login_subtitle(page, subtitle):
    expect(page.locator(login_subtitle)).to_have_text(subtitle)


@then("the login email input field should be visible")
def verify_login_email_input(page):
    expect(page.locator(email_input)).to_be_visible()


@then("the login password input field should be visible")
def verify_login_password_input(page):
    expect(page.locator(password_input)).to_be_visible()


@then("the login password toggle button should be visible")
def verify_login_password_toggle(page):
    expect(page.locator(password_toggle_button)).to_be_visible()


@then("the sign in submit button should be visible")
def verify_signin_submit_button(page):
    expect(page.locator(submit_button)).to_be_visible()


@then("the sign up navigation link should be visible on the login page")
def verify_signup_nav_link(page):
    expect(page.locator(signup_link_button)).to_be_visible()


@then("the business login navigation link should be visible")
def verify_business_login_nav_link(page):
    expect(page.locator(business_login_link_button)).to_be_visible()
