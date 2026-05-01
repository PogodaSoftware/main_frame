from pytest_bdd import scenarios, given, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.pogoda.beauty.bookings_list_page import (
    bookings_page_root,
    page_title as bookings_page_title,
    segmented as bookings_segmented,
    empty_card as bookings_empty_card,
    bottom_nav as bookings_bottom_nav,
)

from ._auth_helpers import ui_login

scenarios("../../features/Pogoda/Beauty/beauty_bookings_list_page.feature")


@given("an authenticated customer is on the bookings list page")
def auth_customer_on_bookings(page, test_customer):
    ui_login(page, test_customer["email"], test_customer["password"])
    selecting_different_routes(page, 'beauty_bookings')
    page.wait_for_timeout(3000)


@then("the beauty bookings list page should be visible")
def verify_root(page):
    expect(page.locator(bookings_page_root).first).to_be_visible()


@then("the bookings page title should be visible")
def verify_title(page):
    expect(page.locator(bookings_page_title)).to_be_visible()


@then("the bookings segmented tabs should be visible")
def verify_segmented(page):
    expect(page.locator(bookings_segmented)).to_be_visible()


@then("the bookings empty state should be visible")
def verify_empty_state(page):
    expect(page.locator(bookings_empty_card).first).to_be_visible()


@then("the bookings bottom nav should be visible")
def verify_bottom_nav(page):
    expect(page.locator(bookings_bottom_nav)).to_be_visible()
