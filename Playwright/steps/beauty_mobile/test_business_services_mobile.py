"""Smoke tests for business services list + service form screens (Phase 4e)."""
import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.business_services_page import (
    services_add_btn,
    services_empty_state,
)
from Playwright.pages.pogoda.beauty_mobile.business_service_form_page import (
    service_form_name,
    service_form_submit,
)


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_services_list_renders(page: Page, test_business):
    """Services list screen loads and shows the Add button."""
    selecting_different_routes_mobile(page, "beauty_business_services")
    page.wait_for_timeout(2000)
    expect(page.locator(services_add_btn)).to_be_visible()


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_services_empty_state(page: Page, test_business):
    """Empty state is shown when provider has no services."""
    selecting_different_routes_mobile(page, "beauty_business_services")
    page.wait_for_timeout(2000)
    expect(page.locator(services_empty_state)).to_be_visible()


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_service_form_new_renders(page: Page, test_business):
    """Add service form (id=new) renders name field and submit button."""
    selecting_different_routes_mobile(page, "beauty_business_service_new")
    page.wait_for_timeout(2000)
    expect(page.locator(service_form_name)).to_be_visible()
    expect(page.locator(service_form_submit)).to_be_visible()
