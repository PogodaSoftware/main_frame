import uuid
import pytest
from pytest_bdd import scenarios, given, when, then, parsers
from playwright.sync_api import expect
import requests

from Playwright.Hooks.hooks import goto_route, timeout_for_testing
from Playwright.pages.pogoda.beauty.business_application_page import (
    shell_root,
    step_counter,
    server_error,
    entity_radio_business,
    entity_itin_input,
    entity_first_input,
    entity_last_input,
    entity_business_name_input,
    entity_submit,
    service_checkbox,
    services_submit,
    stripe_submit,
    schedule_submit,
    tools_submit,
    tos_checkbox,
    submit_application_button,
)
from .beauty_utils import (
    BACKEND_URL,
    TEST_DEVICE_ID,
    attach_business_session_cookie,
    delete_test_users,
    login_business_via_api,
)

scenarios("../../features/Pogoda/Beauty/beauty_business_application.feature")


@pytest.fixture(scope="function")
def wizard_business():
    email = f"wiz_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "WizardPass123!"
    name = "Wizard Studio"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={"email": email, "password": password, "business_name": name},
        timeout=10,
    )
    assert resp.status_code == 201, f"Setup failed: {resp.text}"
    yield {"email": email, "password": password, "business_name": name}
    delete_test_users(email)


@given("a fresh business account exists for the wizard")
def fresh_business(wizard_business):
    return wizard_business


@given("I sign in as the wizard business account")
def sign_in_business(page, wizard_business):
    cookie = login_business_via_api(wizard_business["email"], wizard_business["password"])
    attach_business_session_cookie(page, cookie)


@when(parsers.parse('I open the wizard step "{step}"'))
def open_step(page, step):
    route_map = {
        'entity':   'beauty_business_apply_entity',
        'services': 'beauty_business_apply_services',
        'stripe':   'beauty_business_apply_stripe',
        'schedule': 'beauty_business_apply_schedule',
        'tools':    'beauty_business_apply_tools',
        'review':   'beauty_business_apply_review',
    }
    goto_route(page, route_map[step])
    timeout_for_testing(page)


@then(parsers.parse('the wizard step counter should display "{label}"'))
def counter_text(page, label):
    expect(page.locator(step_counter)).to_have_text(label)


@when(parsers.parse('I fill in the entity step as a person named "{full_name}" for "{biz}"'))
def fill_entity(page, full_name, biz):
    parts = full_name.split(' ', 1)
    first = parts[0]
    last = parts[1] if len(parts) > 1 else ''
    page.locator(entity_first_input).fill(first)
    page.locator(entity_last_input).fill(last)
    page.locator(entity_business_name_input).fill(biz)


@when("I submit the entity step")
def submit_entity(page):
    page.locator(entity_submit).click()
    timeout_for_testing(page)


@when(parsers.parse('I select the "{cat}" service category'))
def select_category(page, cat):
    page.locator(service_checkbox.format(category=cat)).check()


@when("I submit the services step")
def submit_services(page):
    page.locator(services_submit).click()
    timeout_for_testing(page)


@when("I submit the stripe step")
def submit_stripe(page):
    page.locator(stripe_submit).click()
    timeout_for_testing(page)


@when("I submit the schedule step")
def submit_schedule(page):
    page.locator(schedule_submit).click()
    timeout_for_testing(page)


@when("I submit the tools step")
def submit_tools(page):
    page.locator(tools_submit).click()
    timeout_for_testing(page)


@then("the submit application button should be disabled")
def submit_disabled(page):
    expect(page.locator(submit_application_button)).to_be_disabled()


@when("I tick the terms of service checkbox")
def tick_tos(page):
    page.locator(tos_checkbox).check()


@then("the submit application button should be enabled")
def submit_enabled(page):
    expect(page.locator(submit_application_button)).to_be_enabled()


@when("I submit the application")
def submit_app(page):
    page.locator(submit_application_button).click()
    page.wait_for_url("**/business", timeout=10_000)


@then("I should land on the business home page")
def land_on_dashboard(page):
    assert "/business" in page.url
    expect(page.locator(shell_root.replace('business-shell', 'business-shell.business-home'))).to_be_visible()


@when("I choose the business entity option")
def choose_business(page):
    page.locator(entity_radio_business).check()


@when("I leave the ITIN field blank")
def blank_itin(page):
    page.locator(entity_itin_input).fill("")
    page.locator(entity_first_input).fill("Sam")
    page.locator(entity_last_input).fill("Owner")
    page.locator(entity_business_name_input).fill("Sam's Studio")


@then("I should see a server error mentioning ITIN")
def see_itin_error(page):
    expect(page.locator(server_error)).to_contain_text("ITIN")
