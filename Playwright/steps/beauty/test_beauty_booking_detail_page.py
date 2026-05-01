import re

from pytest_bdd import scenarios, given, then, parsers
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.pogoda.beauty.book_page import (
    day_chip_first as book_day_chip_first,
    time_chip_first as book_time_chip_first,
    confirm_button as book_confirm_button,
)
from Playwright.pages.pogoda.beauty.bookings_list_page import (
    booking_title_button,
)
from Playwright.pages.pogoda.beauty.booking_detail_page import (
    booking_detail_page_root,
    sub_header_title as detail_sub_header_title,
    title as detail_title,
    info_card as detail_info_card,
    cancel_button as detail_cancel_button,
    bottom_nav as detail_bottom_nav,
)

from ._auth_helpers import ui_login

scenarios("../../features/Pogoda/Beauty/beauty_booking_detail_page.feature")


_SERVICE_ID = 10  # Signature Facial


@given("an authenticated customer has an upcoming booking and is viewing it")
def book_and_view_detail(page, test_customer):
    ui_login(page, test_customer["email"], test_customer["password"])
    # Make a booking via the UI.
    selecting_different_routes(page, 'beauty_book', serviceId=_SERVICE_ID)
    page.wait_for_timeout(2500)
    page.locator(book_day_chip_first).click()
    page.wait_for_timeout(500)
    page.locator(book_time_chip_first).click()
    page.wait_for_timeout(500)
    page.locator(book_confirm_button).click()
    # Wait for navigation to /success
    page.wait_for_url(re.compile(r"/pogoda/beauty/bookings/\d+/success"), timeout=15000)

    # Navigate to the bookings list and open the booking detail.
    selecting_different_routes(page, 'beauty_bookings')
    page.wait_for_timeout(2500)
    # `.b-card` is a div; the click handler lives on the inner title button.
    page.locator(booking_title_button).first.click()
    page.wait_for_timeout(3000)


@then("the beauty booking detail page should be visible")
def verify_detail_root(page):
    expect(page.locator(booking_detail_page_root).first).to_be_visible()


@then(parsers.parse('the booking detail sub-header title should display "{text}"'))
def verify_sub_header_title(page, text):
    expect(page.locator(detail_sub_header_title)).to_have_text(text)


@then("the booking detail title should be visible")
def verify_detail_title(page):
    expect(page.locator(detail_title)).to_be_visible()


@then("the booking detail info card should be visible")
def verify_info_card(page):
    expect(page.locator(detail_info_card)).to_be_visible()


@then("the booking detail cancel button should be visible")
def verify_cancel_button(page):
    expect(page.locator(detail_cancel_button)).to_be_visible()


@then("the booking detail bottom nav should be visible")
def verify_bottom_nav(page):
    expect(page.locator(detail_bottom_nav)).to_be_visible()
