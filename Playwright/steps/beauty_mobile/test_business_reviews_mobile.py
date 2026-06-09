"""Smoke tests for business reviews screen (Phase 4e)."""
import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.business_reviews_page import (
    reviews_heading,
    reviews_empty_state,
)


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_reviews_renders(page: Page, test_business):
    """Business reviews screen loads and shows the heading."""
    selecting_different_routes_mobile(page, "beauty_business_reviews")
    page.wait_for_timeout(2000)
    expect(page.locator(reviews_heading)).to_be_visible()


@pytest.mark.skip(reason="Phase 4e: needs business-login seed stabilized for RN web.")
def test_reviews_empty_state_when_no_reviews(page: Page, test_business):
    """Empty state is shown when the provider has no reviews."""
    selecting_different_routes_mobile(page, "beauty_business_reviews")
    page.wait_for_timeout(2000)
    expect(page.locator(reviews_empty_state)).to_be_visible()
