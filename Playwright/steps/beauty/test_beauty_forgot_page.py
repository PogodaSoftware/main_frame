from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.forgot_page import (
    forgot_page_root,
    back_button as forgot_back_button,
    title as forgot_title,
    email_input as forgot_email_input,
    submit_button as forgot_submit_button,
    info_card as forgot_info_card,
    back_to_signin_link,
)

scenarios("../../features/Pogoda/Beauty/beauty_forgot_page.feature")


@given("I navigate to the beauty forgot page")
def navigate_to_forgot(page):
    selecting_different_routes(page, 'beauty_forgot')
    timeout_for_testing(page)


@then("the beauty forgot page should be visible")
def verify_forgot_visible(page):
    expect(page.locator(forgot_page_root)).to_be_visible()


@then("the forgot back button should be visible")
def verify_back_button(page):
    expect(page.locator(forgot_back_button)).to_be_visible()


@then("the forgot title should be visible")
def verify_title(page):
    expect(page.locator(forgot_title)).to_be_visible()


@then("the forgot email input should be visible")
def verify_email_input(page):
    expect(page.locator(forgot_email_input)).to_be_visible()


@then("the forgot submit button should be visible")
def verify_submit_button(page):
    expect(page.locator(forgot_submit_button)).to_be_visible()


@then("the forgot info card should be visible")
def verify_info_card(page):
    expect(page.locator(forgot_info_card)).to_be_visible()


@then("the forgot back to sign in link should be visible")
def verify_back_link(page):
    expect(page.locator(back_to_signin_link)).to_be_visible()


@when("I type an invalid email into the forgot field")
def type_invalid_email(page):
    page.locator(forgot_email_input).fill("not-an-email")


@when("I type a valid email into the forgot field")
def type_valid_email(page):
    page.locator(forgot_email_input).fill("someone@example.com")


@then("the forgot submit button should be disabled")
def verify_submit_disabled(page):
    expect(page.locator(forgot_submit_button)).to_be_disabled()


@then("the forgot submit button should be enabled")
def verify_submit_enabled(page):
    expect(page.locator(forgot_submit_button)).to_be_enabled()
