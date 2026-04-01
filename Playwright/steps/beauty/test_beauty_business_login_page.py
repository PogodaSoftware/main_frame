import pytest
from pytest_bdd import scenarios, given, then, parsers
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.business_login_page import (
    business_login_page_root,
    business_badge,
    business_login_title,
    business_login_subtitle,
    email_input,
    password_input,
    password_toggle_button,
    submit_button,
    customer_signin_link_button,
)

scenarios("../../features/Pogoda/Beauty/beauty_business_login_page.feature")


@pytest.fixture

@given("I navigate to the beauty business login page")
def navigate_to_beauty_business_login(page):
    selecting_different_routes(page, 'beauty_business_login')
    timeout_for_testing(page)


@then("the business login page should be visible")
def verify_business_login_page_visible(page):
    expect(page.locator(business_login_page_root)).to_be_visible()


@then("the business portal badge should be displayed")
def verify_business_portal_badge(page):
    expect(page.locator(business_badge)).to_be_visible()


@then(parsers.parse('the business login title should display "{title}"'))
def verify_business_login_title(page, title):
    expect(page.locator(business_login_title)).to_have_text(title)


@then(parsers.parse('the business login subtitle should display "{subtitle}"'))
def verify_business_login_subtitle(page, subtitle):
    expect(page.locator(business_login_subtitle)).to_have_text(subtitle)


@then("the business email input field should be visible")
def verify_business_email_input(page):
    expect(page.locator(email_input)).to_be_visible()


@then("the business password input field should be visible")
def verify_business_password_input(page):
    expect(page.locator(password_input)).to_be_visible()


@then("the business sign in submit button should be visible")
def verify_business_submit_button(page):
    expect(page.locator(submit_button)).to_be_visible()


@then("the customer sign in navigation link should be visible")
def verify_customer_signin_nav_link(page):
    expect(page.locator(customer_signin_link_button)).to_be_visible()
