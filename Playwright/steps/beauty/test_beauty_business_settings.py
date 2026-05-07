import uuid
import pytest
import requests
from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import goto_route, timeout_for_testing
from Playwright.pages.pogoda.beauty.business_home_page import home_root, gear_button
from Playwright.pages.pogoda.beauty.business_settings_page import (
    change_password_link,
    schedule_link,
    delete_account_link,
    logout_link,
    modal_primary,
)
from Playwright.pages.pogoda.beauty.business_login_page import business_login_page_root
from .beauty_utils import (
    BACKEND_URL,
    accept_application_via_api,
    attach_business_session_cookie,
    delete_test_users,
    login_business_via_api,
)

scenarios("../../features/Pogoda/Beauty/beauty_business_settings.feature")

# Per-test mutable bag — avoids relying on Playwright's BrowserContext
# accepting arbitrary attributes.
_STATE: dict = {}


@pytest.fixture(scope="function", autouse=True)
def _clear_state():
    _STATE.clear()
    yield
    _STATE.clear()


@pytest.fixture(scope="function")
def accepted_business():
    email = f"set_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "SetPass123!"
    name = "Settings Studio"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={"email": email, "password": password, "business_name": name},
        timeout=10,
    )
    assert resp.status_code == 201, f"Setup failed: {resp.text}"
    accept_application_via_api(email)
    yield {"email": email, "password": password, "business_name": name}
    delete_test_users(email)


@given("I am signed in as an accepted business")
def signed_in(page, accepted_business):
    cookie = login_business_via_api(accepted_business["email"], accepted_business["password"])
    attach_business_session_cookie(page, cookie)
    _STATE["email"] = accepted_business["email"]
    _STATE["password"] = accepted_business["password"]


@when("I open the business home page")
def open_home(page):
    goto_route(page, "beauty_business_home")
    timeout_for_testing(page)
    expect(page.locator(home_root)).to_be_visible()


@when("I click the business gear button")
def click_gear(page):
    page.locator(gear_button).click()
    page.wait_for_url("**/business/settings", timeout=10_000)


@when("I open the business settings page")
def open_settings(page):
    goto_route(page, "beauty_business_settings")
    timeout_for_testing(page)
    expect(page.locator(change_password_link)).to_be_visible()


@then("the business settings menu should render")
def settings_render(page):
    expect(page.locator(change_password_link)).to_be_visible()


@then("I should see a change-password setting")
def see_chpw(page):
    expect(page.locator(change_password_link)).to_be_visible()


@then("I should see a schedule setting")
def see_schedule(page):
    expect(page.locator(schedule_link)).to_be_visible()


@then("I should see a delete-account setting")
def see_delete(page):
    expect(page.locator(delete_account_link)).to_be_visible()


@then("I should see a log-out setting")
def see_logout(page):
    expect(page.locator(logout_link)).to_be_visible()


@when("I click the schedule setting")
def click_schedule(page):
    page.locator(schedule_link).click()
    page.wait_for_url("**/business/availability", timeout=10_000)


@then("I should land on the weekly hours editor")
def lands_hours(page):
    expect(page.locator("css=.day-list")).to_be_visible()


@when("I click the change-password setting")
def click_chpw(page):
    page.locator(change_password_link).click()
    page.wait_for_url("**/business/settings/password", timeout=10_000)


@then("the change-password form should render")
def chpw_form(page):
    expect(page.locator("[data-testid='current-password']")).to_be_visible()
    expect(page.locator("[data-testid='new-password']")).to_be_visible()


@when("I click the log-out setting")
def click_logout_setting(page):
    page.locator(logout_link).click()


@when("I click the delete-account setting")
def click_delete_setting(page):
    page.locator(delete_account_link).click()


@when("I confirm the dialog")
def confirm_dialog(page):
    page.locator(modal_primary).click()


@then("I should land on the business login page")
def lands_login(page):
    page.wait_for_url("**/business/login", timeout=10_000)
    expect(page.locator(business_login_page_root)).to_be_visible()


@then("the business account should be deleted")
def acct_deleted(page):
    # Wait for the post-delete navigation to settle.
    page.wait_for_timeout(2000)
    email = _STATE.get("email")
    password = _STATE.get("password")
    assert email and password
    # Confirm by trying to log in — should now fail with 401.
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/login/",
        json={"email": email, "password": password, "device_id": "x"},
        timeout=10,
    )
    assert resp.status_code == 401, f"Account still exists: {resp.text}"
