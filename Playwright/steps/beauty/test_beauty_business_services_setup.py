import uuid
import pytest
import requests
from pytest_bdd import scenarios, given, when, then, parsers
from playwright.sync_api import expect

from Playwright.Hooks.hooks import goto_route, timeout_for_testing
from Playwright.pages.pogoda.beauty.business_services_page import (
    add_button,
    service_row,
    edit_button,
    delete_button,
    confirm_delete_button,
    service_name_input,
    service_category_select,
    service_price_input,
    service_duration_input,
    service_form_submit,
)
from .beauty_utils import (
    BACKEND_URL,
    accept_application_via_api,
    attach_business_session_cookie,
    delete_test_users,
    login_business_via_api,
)

scenarios("../../features/Pogoda/Beauty/beauty_business_services_setup.feature")


@pytest.fixture(scope="function")
def services_business():
    email = f"svc_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "SvcPass123!"
    name = "Services Studio"
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
def signed_in(page, services_business):
    cookie = login_business_via_api(services_business["email"], services_business["password"])
    attach_business_session_cookie(page, cookie)


@when("I open the business services page")
def open_services(page):
    goto_route(page, 'beauty_business_services')
    timeout_for_testing(page)


@when(parsers.parse('I add a new service named "{name}" in category "{category}"'))
def add_service(page, name, category):
    page.locator(add_button).click()
    timeout_for_testing(page)
    page.locator(service_name_input).fill(name)
    page.locator(service_category_select).select_option(category)
    page.locator(service_price_input).fill("5000")
    page.locator(service_duration_input).fill("60")
    page.locator(service_form_submit).click()
    timeout_for_testing(page)


@then(parsers.parse('the service "{name}" should appear in the services list'))
def service_visible(page, name):
    expect(page.locator(service_row.format(name=name))).to_be_visible()


@when(parsers.parse('I edit the service "{name}" and rename it to "{new_name}"'))
def edit_service(page, name, new_name):
    page.locator(edit_button.format(name=name)).click()
    timeout_for_testing(page)
    page.locator(service_name_input).fill(new_name)
    page.locator(service_form_submit).click()
    timeout_for_testing(page)


@when(parsers.parse('I delete the service "{name}"'))
def delete_service(page, name):
    page.locator(delete_button.format(name=name)).click()
    page.locator(confirm_delete_button).click()
    timeout_for_testing(page)


@then(parsers.parse('the service "{name}" should no longer appear in the services list'))
def service_gone(page, name):
    expect(page.locator(service_row.format(name=name))).to_have_count(0)
