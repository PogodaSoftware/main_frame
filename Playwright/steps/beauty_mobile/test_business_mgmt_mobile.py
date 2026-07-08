"""Smoke ports of the business management portal for the RN web build.

Each test asserts the route lands without crashing and exposes its
primary testID. Deeper interaction (create service, edit availability,
change password, reply to review) requires the business-fixture seed
helpers ported from the Angular suite — those tests are
``pytest.mark.skip`` until that helper batch lands.
"""

import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.business_home_page import (
    business_bottom_nav,
    business_nav_bookings,
    business_nav_home,
    business_nav_profile,
    business_nav_services,
)
from Playwright.pages.pogoda.beauty_mobile.business_services_page import (
    services_add_btn,
    service_form_name,
    service_form_price,
    service_form_submit,
)
from Playwright.pages.pogoda.beauty_mobile.business_availability_page import (
    availability_save_btn,
)
from Playwright.pages.pogoda.beauty_mobile.business_settings_page import (
    contact_field_phone as contact_phone,
    contact_field_public_email as contact_public_email,
    contact_submit,
    pw_field_confirm as password_confirm,
    pw_field_current as password_current,
    pw_field_new as password_new,
    pw_submit as password_submit,
)


def _login_business(page: Page, business) -> None:
    selecting_different_routes_mobile(page, "beauty_business_login")
    page.wait_for_timeout(1500)
    page.locator("css=[data-testid='form-field-email']").fill(business["email"])
    page.locator("css=[data-testid='form-field-password']").fill(business["password"])
    page.locator("css=[data-testid='form-submit']").click()
    page.wait_for_timeout(2500)


# ----- Smoke (no business fixture required for route render only) -------

@pytest.mark.skip(reason="Phase 4e+: needs application wizard completed so home renders dashboard rather than wizard redirect.")
def test_business_home_renders_bottom_nav(page: Page, test_business):
    _login_business(page, test_business)
    selecting_different_routes_mobile(page, "beauty_business_home")
    page.wait_for_timeout(2000)
    expect(page.locator(business_bottom_nav)).to_be_visible()
    for nav in (
        business_nav_home,
        business_nav_bookings,
        business_nav_services,
        business_nav_profile,
    ):
        expect(page.locator(nav)).to_be_visible()


@pytest.mark.skip(reason="Phase 4e+: requires onboarded business fixture.")
def test_business_services_lists_with_add_cta(page: Page, test_business):
    _login_business(page, test_business)
    selecting_different_routes_mobile(page, "beauty_business_services")
    page.wait_for_timeout(2000)
    expect(page.locator(services_add_btn)).to_be_visible()


@pytest.mark.skip(reason="Phase 4e+: requires onboarded business fixture.")
def test_business_service_form_renders_required_fields(page: Page, test_business):
    _login_business(page, test_business)
    selecting_different_routes_mobile(page, "beauty_business_service_form", id="new")
    page.wait_for_timeout(2000)
    expect(page.locator(service_form_name)).to_be_visible()
    expect(page.locator(service_form_price)).to_be_visible()
    expect(page.locator(service_form_submit)).to_be_visible()


@pytest.mark.skip(reason="Phase 4e+: requires onboarded business fixture.")
def test_business_availability_renders_save_button(page: Page, test_business):
    _login_business(page, test_business)
    selecting_different_routes_mobile(page, "beauty_business_availability")
    page.wait_for_timeout(2000)
    expect(page.locator(availability_save_btn)).to_be_visible()


@pytest.mark.skip(reason="Phase 4e+: requires onboarded business fixture.")
def test_business_change_password_renders_three_fields(page: Page, test_business):
    _login_business(page, test_business)
    selecting_different_routes_mobile(page, "beauty_business_change_password")
    page.wait_for_timeout(2000)
    expect(page.locator(password_current)).to_be_visible()
    expect(page.locator(password_new)).to_be_visible()
    expect(page.locator(password_confirm)).to_be_visible()
    expect(page.locator(password_submit)).to_be_visible()


@pytest.mark.skip(reason="Phase 4e+: requires onboarded business fixture.")
def test_business_email_contact_renders_form(page: Page, test_business):
    _login_business(page, test_business)
    selecting_different_routes_mobile(page, "beauty_business_email_contact")
    page.wait_for_timeout(2000)
    expect(page.locator(contact_public_email)).to_be_visible()
    expect(page.locator(contact_phone)).to_be_visible()
    expect(page.locator(contact_submit)).to_be_visible()
