import pytest
from pytest_bdd import scenarios, given, then, parsers
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.business_signup_page import (
    business_signup_page_root,
    business_signup_title,
    business_name_input,
    email_input,
    password_input,
    submit_button,
    business_login_link,
)

scenarios("../../features/Pogoda/Beauty/beauty_business_signup_page.feature")


@pytest.fixture

@given("I navigate to the beauty business signup page")
def navigate(page):
    selecting_different_routes(page, 'beauty_business_signup')
    timeout_for_testing(page)


@then("the business signup page should be visible")
def page_visible(page):
    expect(page.locator(business_signup_page_root)).to_be_visible()


@then(parsers.parse('the business signup title should display "{title}"'))
def title_visible(page, title):
    expect(page.locator(business_signup_title)).to_have_text(title)


@then("the business signup business name input should be visible")
def biz_input(page):
    expect(page.locator(business_name_input)).to_be_visible()


@then("the business signup email input should be visible")
def email_visible(page):
    expect(page.locator(email_input)).to_be_visible()


@then("the business signup password input should be visible")
def password_visible(page):
    expect(page.locator(password_input)).to_be_visible()


@then("the business signup submit button should be visible")
def submit_visible(page):
    expect(page.locator(submit_button)).to_be_visible()


@then("the business signup login link should be visible")
def link_visible(page):
    expect(page.locator(business_login_link)).to_be_visible()
