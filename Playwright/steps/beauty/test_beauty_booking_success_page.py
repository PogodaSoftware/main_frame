import re

from pytest_bdd import scenarios, given, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.pogoda.beauty.book_page import (
    day_chip_first as book_day_chip_first,
    time_chip_first as book_time_chip_first,
    confirm_button as book_confirm_button,
)
from Playwright.pages.pogoda.beauty.booking_success_page import (
    booking_success_page_root,
    share_button as success_share_button,
    title as success_title,
    summary_card as success_summary_card,
    conf_chip as success_conf_chip,
    view_my_bookings_button,
    bottom_nav as success_bottom_nav,
)

from ._auth_helpers import ui_login

scenarios("../../features/Pogoda/Beauty/beauty_booking_success_page.feature")


_SERVICE_ID = 10  # Signature Facial


@given("an authenticated customer just confirmed a booking")
def confirm_a_booking(page, test_customer):
    ui_login(page, test_customer["email"], test_customer["password"])
    selecting_different_routes(page, 'beauty_book', serviceId=_SERVICE_ID)
    page.wait_for_timeout(2500)
    page.locator(book_day_chip_first).click()
    page.wait_for_timeout(500)
    page.locator(book_time_chip_first).click()
    page.wait_for_timeout(500)
    page.locator(book_confirm_button).click()
    page.wait_for_url(re.compile(r"/pogoda/beauty/bookings/\d+/success"), timeout=15000)
    page.wait_for_timeout(2000)


@then("the beauty booking success page should be visible")
def verify_root(page):
    expect(page.locator(booking_success_page_root).first).to_be_visible()


@then("the booking success share button should be visible")
def verify_share(page):
    expect(page.locator(success_share_button)).to_be_visible()


@then("the booking success title should be visible")
def verify_title(page):
    expect(page.locator(success_title)).to_be_visible()


@then("the booking success summary card should be visible")
def verify_summary(page):
    expect(page.locator(success_summary_card)).to_be_visible()


@then("the booking success confirmation chip should be visible")
def verify_conf_chip(page):
    expect(page.locator(success_conf_chip)).to_be_visible()


@then("the view my bookings button should be visible")
def verify_view_bookings(page):
    expect(page.locator(view_my_bookings_button)).to_be_visible()


@then("the booking success bottom nav should be visible")
def verify_bottom_nav(page):
    expect(page.locator(success_bottom_nav)).to_be_visible()
