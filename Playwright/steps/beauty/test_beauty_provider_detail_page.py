from pytest_bdd import scenarios, given, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.pogoda.beauty.provider_detail_page import (
    provider_page_root,
    hero as provider_hero,
    services_title as provider_services_title,
    service_row as provider_service_row,
    book_button as provider_book_button,
    bottom_nav as provider_bottom_nav,
)

from ._auth_helpers import ui_login

scenarios("../../features/Pogoda/Beauty/beauty_provider_detail_page.feature")


# Pick a known seeded provider id. The seed inserts providers 5..8; id=5
# is the facial studio with two seeded services.
_PROVIDER_ID = 5


@given("an authenticated customer is on a provider detail page")
def auth_customer_on_provider_detail(page, test_customer):
    ui_login(page, test_customer["email"], test_customer["password"])
    selecting_different_routes(page, 'beauty_provider', id=_PROVIDER_ID)
    page.wait_for_timeout(3000)


@then("the beauty provider page should be visible")
def verify_provider_root(page):
    expect(page.locator(provider_page_root).first).to_be_visible()


@then("the provider hero should be visible")
def verify_provider_hero(page):
    expect(page.locator(provider_hero)).to_be_visible()


@then("the provider services title should be visible")
def verify_services_title(page):
    expect(page.locator(provider_services_title)).to_be_visible()


@then("at least one provider service row should be visible")
def verify_service_row(page):
    expect(page.locator(provider_service_row).first).to_be_visible()


@then("at least one provider book button should be visible")
def verify_book_button(page):
    expect(page.locator(provider_book_button).first).to_be_visible()


@then("the provider bottom nav should be visible")
def verify_bottom_nav(page):
    expect(page.locator(provider_bottom_nav)).to_be_visible()
