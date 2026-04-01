import uuid
import pytest
from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.signup_page import (
    email_input as signup_email_input,
    password_input as signup_password_input,
    submit_button as signup_submit_button,
)
from Playwright.pages.pogoda.beauty.login_page import (
    email_input as login_email_input,
    password_input as login_password_input,
    submit_button as login_submit_button,
)
from Playwright.pages.pogoda.beauty.home_page import (
    home_page_root,
    user_email_badge,
    signout_button,
    signin_button,
    signup_button,
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


@when("I submit the signup form")
def submit_signup(page):
    page.locator(signup_submit_button).click()
    page.wait_for_timeout(3000)


@then("I should be on the beauty home page after signup")
def verify_home_after_signup(page):
    expect(page.locator(home_page_root)).to_be_visible()


@then("the user email badge should be visible after signup")
def verify_email_badge_after_signup(page):
    expect(page.locator(user_email_badge)).to_be_visible()


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


@then("the user email badge should be visible after login")
def verify_email_badge_after_login(page):
    expect(page.locator(user_email_badge)).to_be_visible()


@given("I fill in the login email and password for logout")
def fill_login_for_logout(page, logout_customer_creds):
    page.locator(login_email_input).fill(logout_customer_creds["email"])
    page.locator(login_password_input).fill(logout_customer_creds["password"])


@given("I submit the login form for logout")
def submit_login_for_logout(page):
    page.locator(login_submit_button).click()
    page.wait_for_timeout(3000)


@when("I click the sign out button")
def click_signout(page):
    expect(page.locator(signout_button)).to_be_visible()
    page.locator(signout_button).click()
    page.wait_for_timeout(3000)


@then("the sign in button should be visible on the home page after logout")
def verify_signin_visible_after_logout(page):
    expect(page.locator(signin_button)).to_be_visible()


@then("the sign up button should be visible on the home page after logout")
def verify_signup_visible_after_logout(page):
    expect(page.locator(signup_button)).to_be_visible()
