import uuid
import pytest
import requests
from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import goto_route, timeout_for_testing
from Playwright.pages.pogoda.beauty.business_change_password_page import (
    current_input,
    new_input,
    submit_btn,
    message,
)
from .beauty_utils import (
    BACKEND_URL,
    TEST_DEVICE_ID,
    accept_application_via_api,
    attach_business_session_cookie,
    delete_test_users,
    login_business_via_api,
)

scenarios("../../features/Pogoda/Beauty/beauty_business_change_password.feature")

ORIGINAL_PASSWORD = "ChPwPass123!"
NEW_PASSWORD = "NewStrongPass456!"

_STATE: dict = {}


@pytest.fixture(scope="function", autouse=True)
def _clear_state():
    _STATE.clear()
    yield
    _STATE.clear()


@pytest.fixture(scope="function")
def accepted_business():
    email = f"chpw_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    name = "Change Pwd Studio"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={"email": email, "password": ORIGINAL_PASSWORD, "business_name": name},
        timeout=10,
    )
    assert resp.status_code == 201, f"Setup failed: {resp.text}"
    accept_application_via_api(email)
    yield {"email": email, "password": ORIGINAL_PASSWORD, "business_name": name}
    delete_test_users(email)


@given("I am signed in as an accepted business")
def signed_in(page, accepted_business):
    cookie = login_business_via_api(accepted_business["email"], ORIGINAL_PASSWORD)
    attach_business_session_cookie(page, cookie)
    _STATE["email"] = accepted_business["email"]


@when("I open the change-password page")
def open_chpw(page):
    goto_route(page, "beauty_business_change_password")
    timeout_for_testing(page)
    expect(page.locator(current_input)).to_be_visible()


@when("I enter my current password and a new strong password")
def enter_correct(page):
    page.locator(current_input).fill(ORIGINAL_PASSWORD)
    page.locator(new_input).fill(NEW_PASSWORD)


@when("I enter a wrong current password and a new strong password")
def enter_wrong(page):
    page.locator(current_input).fill("wrong-password-xyz")
    page.locator(new_input).fill(NEW_PASSWORD)


@when("I submit the change-password form")
def submit(page):
    page.locator(submit_btn).click()
    page.wait_for_timeout(1500)


@then("the form should report the password was updated")
def report_ok(page):
    expect(page.locator(message)).to_contain_text("updated")


@then("I should be able to sign in with the new password")
def can_login(page):
    email = _STATE.get("email")
    assert email is not None
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/login/",
        json={"email": email, "password": NEW_PASSWORD, "device_id": TEST_DEVICE_ID},
        timeout=10,
    )
    assert resp.status_code == 200, f"New password login failed: {resp.text}"


@then("the form should report a current password error")
def report_err(page):
    msg = page.locator(message)
    expect(msg).to_be_visible()
    text = msg.inner_text().lower()
    assert "current" in text or "incorrect" in text, f"Unexpected msg: {text}"
