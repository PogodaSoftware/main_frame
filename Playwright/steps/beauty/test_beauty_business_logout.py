import uuid
import pytest
import requests
from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import goto_route, timeout_for_testing
from Playwright.pages.pogoda.beauty.business_home_page import (
    home_root,
    gear_button,
)
from Playwright.pages.pogoda.beauty.business_login_page import business_login_page_root
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    accept_application_via_api,
    attach_business_session_cookie,
    delete_test_users,
    login_business_via_api,
)

scenarios("../../features/Pogoda/Beauty/beauty_business_logout.feature")


@pytest.fixture(scope="function")
def accepted_business():
    email = f"acc_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "AccPass123!"
    name = "Accepted Studio"
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


@when("I open the business home page")
def open_home(page):
    goto_route(page, 'beauty_business_home')
    timeout_for_testing(page)
    expect(page.locator(home_root)).to_be_visible()


@when("I click the business sign-out button")
def click_signout(page):
    # Sign-out lives under the gear → settings menu now.
    page.locator(gear_button).click()
    page.wait_for_url("**/business/settings", timeout=10_000)
    page.locator("[data-testid='settings-logout']").click()
    # Confirm modal — primary action
    page.locator("button.beauty-modal-btn.primary").click()
    page.wait_for_url("**/business/login", timeout=10_000)


@then("I should land on the business login page")
def lands_login(page):
    expect(page.locator(business_login_page_root)).to_be_visible()


@then("the beauty session cookie should not be present")
def no_cookie(page):
    cookies = page.context.cookies()
    names = {c["name"] for c in cookies}
    assert BEAUTY_SESSION_COOKIE not in names, f"Cookie still present: {cookies}"
