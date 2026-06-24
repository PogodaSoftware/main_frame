import uuid
import pytest
from pytest_bdd import scenarios, given, when, then, parsers
from playwright.sync_api import expect
import requests

from Playwright.Hooks.hooks import goto_route, timeout_for_testing
from Playwright.pages.pogoda.beauty.weekly_hours_editor_page import (
    editor_root,
    quickset_label,
    quickset_chip_by_text,
    day_rows,
    day_sub_nth,
    seg_24h_nth,
    time_pair_nth,
    tz_banner,
    tz_rail_card,
    legacy_closed_checkbox,
)
from .beauty_utils import (
    BACKEND_URL,
    accept_application_via_api,
    advance_to_schedule_step_via_api,
    attach_business_session_cookie,
    delete_test_users,
    login_business_via_api,
)

scenarios("../../features/Beauty/beauty_weekly_hours_editor.feature")


@pytest.fixture(scope="function")
def hours_editor_business():
    email = f"hrs_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "HoursPass123!"
    name = "Hours Studio"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={"email": email, "password": password, "business_name": name},
        timeout=10,
    )
    assert resp.status_code == 201, f"Setup failed: {resp.text}"
    yield {"email": email, "password": password, "business_name": name}
    delete_test_users(email)


@given("a fresh business account exists for the hours editor")
def fresh_hours_business(hours_editor_business):
    return hours_editor_business


@given("the hours editor business has an accepted application")
def accept_app(hours_editor_business):
    accept_application_via_api(hours_editor_business["email"])


@given("I sign in as the hours editor business account")
def sign_in_hours(page, hours_editor_business):
    cookie = login_business_via_api(
        hours_editor_business["email"], hours_editor_business["password"]
    )
    attach_business_session_cookie(page, cookie)


@when(parsers.parse('I open the wizard step "{step}" for hours editor'))
def open_wizard_step(page, hours_editor_business, step):
    # Schedule step is gated on entity/services/stripe completion. Mark them
    # done via the backend so the schedule URL renders without walking each
    # form by hand — the editor UI is what we're testing here.
    if step == "schedule":
        advance_to_schedule_step_via_api(hours_editor_business["email"])
    route_map = {
        "schedule": "beauty_business_apply_schedule",
    }
    goto_route(page, route_map[step])
    timeout_for_testing(page)


@when("I open the availability page")
def open_availability(page):
    goto_route(page, "beauty_business_availability")
    timeout_for_testing(page)


@then("the weekly hours editor should be visible")
def editor_visible(page):
    expect(page.locator(editor_root)).to_be_visible()


@then("the legacy closed-day checkbox should not be present")
def no_legacy_checkbox(page):
    expect(page.locator(legacy_closed_checkbox)).to_have_count(0)


@then(parsers.parse('the quick set label should display "{label}"'))
def quickset_label_text(page, label):
    expect(page.locator(quickset_label)).to_have_text(label)


@then(parsers.parse('the editor should render exactly {n:d} day rows'))
def seven_rows(page, n):
    expect(page.locator(day_rows)).to_have_count(n)


@then(parsers.parse('the time zone banner should mention "{token}"'))
def tz_banner_token(page, token):
    expect(page.locator(tz_banner)).to_contain_text(token)


@when(parsers.parse('I click the quick set chip "{label}"'))
def click_quickset(page, label):
    page.locator(quickset_chip_by_text.format(label=label)).click()


@then(parsers.parse('day row {n:d} sub-label should display "{text}"'))
def day_sub_text(page, n, text):
    expect(page.locator(day_sub_nth.format(n=n))).to_have_text(text)


@when(parsers.parse('I click the 24h segment on day row {n:d}'))
def click_24h(page, n):
    page.locator(seg_24h_nth.format(n=n)).click()


@then(parsers.parse('day row {n:d} time pair should be hidden'))
def time_pair_hidden(page, n):
    expect(page.locator(time_pair_nth.format(n=n))).to_have_count(0)


@then("the time zone rail card should be visible")
def tz_rail_card_visible(page):
    """Availability page hides the inline tz-banner and shows a rail card instead."""
    expect(page.locator(tz_rail_card)).to_be_visible()
