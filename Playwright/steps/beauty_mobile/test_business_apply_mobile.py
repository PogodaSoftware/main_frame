"""Smoke port of business apply wizard for the RN web build.

The Angular suite covers this flow in ``test_beauty_business_application.py``
end-to-end. The RN port mirrors the same step-by-step structure but most
deep cases (form persistence across steps, validation, ToS submit) are
parked behind ``pytest.mark.skip(reason="phase 4d+")`` until the
business-fixture seed helpers are migrated from the Angular suite.
"""

import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.business_apply_page import (
    wizard_brand_name,
    wizard_continue,
    wizard_step_counter,
    wizard_step_title,
)


def _login_business(page: Page, business) -> None:
    """Drive the business-login form. RN web build uses the same FormRenderer
    testIDs as the customer login (``form-field-email`` / ``form-submit``).
    """
    from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
    selecting_different_routes_mobile(page, "beauty_business_login")
    page.wait_for_timeout(1500)
    page.locator("css=[data-testid='form-field-email']").fill(business["email"])
    page.locator("css=[data-testid='form-field-password']").fill(business["password"])
    page.locator("css=[data-testid='form-submit']").click()
    page.wait_for_timeout(2500)


@pytest.mark.skip(reason="Phase 4d+: needs business-login flow stabilized for RN web — re-enable once landing route resolves to /(business)/apply/entity automatically.")
def test_apply_entity_renders_wizard_chrome(page: Page, test_business):
    _login_business(page, test_business)
    selecting_different_routes_mobile(page, "beauty_business_apply_entity")
    page.wait_for_timeout(2000)
    expect(page.locator(wizard_brand_name)).to_have_text("Beauty")
    expect(page.locator(wizard_step_counter)).to_contain_text("Step 1 of 6")
    expect(page.locator(wizard_step_title)).to_be_visible()
    expect(page.locator(wizard_continue)).to_be_visible()


@pytest.mark.skip(reason="Phase 4d+: requires entity step pre-filled.")
def test_apply_services_step_visible(page: Page, test_business):
    pass


@pytest.mark.skip(reason="Phase 4d+: requires services step complete.")
def test_apply_stripe_step_marks_complete(page: Page, test_business):
    pass


@pytest.mark.skip(reason="Phase 4d+: requires stripe step complete.")
def test_apply_schedule_step_toggles_closed(page: Page, test_business):
    pass


@pytest.mark.skip(reason="Phase 4d+: requires schedule step complete.")
def test_apply_tools_step_persists_selection(page: Page, test_business):
    pass


@pytest.mark.skip(reason="Phase 4d+: end-to-end happy path — requires all prior steps complete.")
def test_apply_review_submit_navigates_to_business_home(page: Page, test_business):
    pass
