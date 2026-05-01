import uuid
import pytest
from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.signup_page import (
    email_input as signup_email_input,
    password_input as signup_password_input,
    submit_button as signup_submit_button,
    terms_checkbox as signup_terms_checkbox,
)
from Playwright.pages.pogoda.beauty.login_page import (
    email_input as login_email_input,
    password_input as login_password_input,
    submit_button as login_submit_button,
)
from Playwright.pages.pogoda.beauty.home_page import (
    home_page_root,
    bottom_nav,
    nav_tab_profile,
)
from Playwright.pages.pogoda.beauty.profile_page import (
    sign_out_button,
)
from Playwright.pages.pogoda.beauty.welcome_page import (
    welcome_page_root,
    signin_button as welcome_signin_button,
)

from .beauty_utils import delete_test_users

scenarios("../../features/Pogoda/Beauty/beauty_auth_flow.feature")


@given("I prepare fresh signup credentials", target_fixture="signup_credentials")
def prepare_fresh_signup_credentials():
    email = f"test_flow_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "TestPass123!"
    yield {"email": email, "password": password}
    delete_test_users(email)


@given("a test customer account exists for login", target_fixture="login_customer_creds")
def customer_exists_for_login(test_customer):
    return test_customer


@given("a test customer account exists for logout", target_fixture="logout_customer_creds")
def customer_exists_for_logout(test_customer):
    return test_customer


@pytest.fixture
@given("I navigate to the beauty signup page")
def go_to_signup_page(page):
    selecting_different_routes(page, 'beauty_signup')
    timeout_for_testing(page)


@pytest.fixture
@given("I navigate to the beauty login page")
def go_to_login_page(page):
    selecting_different_routes(page, 'beauty_login')
    timeout_for_testing(page)


@when("I fill in the signup email and password")
def fill_signup_form(page, signup_credentials):
    page.locator(signup_email_input).fill(signup_credentials["email"])
    page.locator(signup_password_input).fill(signup_credentials["password"])
    # Dynamic-form signup now requires accepting the terms checkbox before
    # the submit button enables.
    page.locator(signup_terms_checkbox).click()


@when("I submit the signup form")
def submit_signup(page):
    page.locator(signup_submit_button).click()
    page.wait_for_timeout(3000)


@then("I should be on the beauty welcome page after signup")
def verify_welcome_after_signup(page):
    expect(page.locator(welcome_page_root)).to_be_visible()


@then("the welcome sign in button should be visible after signup")
def verify_welcome_signin_after_signup(page):
    expect(page.locator(welcome_signin_button)).to_be_visible()


@when("I fill in the login email and password for the test customer")
def fill_login_form_for_customer(page, login_customer_creds):
    page.locator(login_email_input).fill(login_customer_creds["email"])
    page.locator(login_password_input).fill(login_customer_creds["password"])


@when("I submit the login form")
def submit_login(page):
    page.locator(login_submit_button).click()
    page.wait_for_timeout(3000)


@then("I should be on the beauty home page after login")
def verify_home_after_login(page):
    expect(page.locator(home_page_root)).to_be_visible()


@then("the bottom nav should be visible after login")
def verify_bottom_nav_after_login(page):
    expect(page.locator(bottom_nav)).to_be_visible()


@given("I fill in the login email and password for logout")
def fill_login_for_logout(page, logout_customer_creds):
    page.locator(login_email_input).fill(logout_customer_creds["email"])
    page.locator(login_password_input).fill(logout_customer_creds["password"])


@given("I submit the login form for logout")
def submit_login_for_logout(page):
    page.locator(login_submit_button).click()
    page.wait_for_timeout(3000)


@when("I open the profile page from the bottom nav")
def open_profile_from_nav(page):
    expect(page.locator(nav_tab_profile)).to_be_visible()
    page.locator(nav_tab_profile).click()
    page.wait_for_timeout(2000)


@when("I click the sign out button on the profile page")
def click_signout_on_profile(page):
    expect(page.locator(sign_out_button)).to_be_visible()
    page.locator(sign_out_button).click()
    # Sign-out now opens a confirm modal — click the primary button to confirm.
    page.locator(
        "css=div.beauty-modal-backdrop button.beauty-modal-btn.primary"
    ).click()
    page.wait_for_timeout(3000)


@then("I should be back on the welcome page after logout")
def verify_welcome_visible(page):
    expect(page.locator(welcome_page_root)).to_be_visible()


@then("the welcome sign in button should be visible")
def verify_welcome_signin_visible(page):
    expect(page.locator(welcome_signin_button)).to_be_visible()
