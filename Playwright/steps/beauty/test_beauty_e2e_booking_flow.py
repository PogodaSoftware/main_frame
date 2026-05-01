"""End-to-end flow: signup → home → category → book → success → list → detail."""

import re

from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.pogoda.beauty.home_page import (
    home_page_root,
    carousel_item,
)
from Playwright.pages.pogoda.beauty.category_page import (
    category_page_root,
    book_button as category_book_button,
    service_name as category_service_name,
)
from Playwright.pages.pogoda.beauty.book_page import (
    day_chip_first as book_day_chip_first,
    time_chip_first as book_time_chip_first,
    confirm_button as book_confirm_button,
    title as book_title,
)
from Playwright.pages.pogoda.beauty.booking_success_page import (
    booking_success_page_root,
    summary_card as success_summary_card,
    view_my_bookings_button,
)
from Playwright.pages.pogoda.beauty.bookings_list_page import (
    bookings_page_root,
    booking_card,
    booking_title_button,
)
from Playwright.pages.pogoda.beauty.booking_detail_page import (
    booking_detail_page_root,
    cancel_button as detail_cancel_button,
)

from ._auth_helpers import ui_login

scenarios("../../features/Pogoda/Beauty/beauty_e2e_booking_flow.feature")


@given(
    "a fresh authenticated customer is on the beauty home page",
    target_fixture="e2e_state",
)
def fresh_authed_customer_on_home(page, test_customer):
    ui_login(page, test_customer["email"], test_customer["password"])
    selecting_different_routes(page, 'beauty_home')
    page.wait_for_timeout(3000)
    expect(page.locator(home_page_root).first).to_be_visible()
    return {"service_name": None}


@when("I tap the first category card on the home page")
def tap_first_category(page, e2e_state):
    # The home carousel auto-scrolls via CSS keyframes after a 2s delay,
    # which trips Playwright's element-stable check. Use dispatch_event so
    # the click goes through without waiting for the animation to settle.
    page.locator(carousel_item).first.dispatch_event('click')
    page.wait_for_timeout(2500)
    expect(page.locator(category_page_root).first).to_be_visible()


@when("I tap the first book button on the category page")
def tap_first_book(page, e2e_state):
    # Capture the service name on the row that owns the first Book button.
    name = page.locator(category_service_name).first.inner_text().strip()
    e2e_state["service_name"] = name
    page.locator(category_book_button).first.click()
    page.wait_for_timeout(2500)
    expect(page.locator(book_title)).to_be_visible()


@when("I select the first available day chip")
def select_first_day(page):
    page.locator(book_day_chip_first).click()
    page.wait_for_timeout(500)


@when("I select the first available time chip")
def select_first_time(page):
    page.locator(book_time_chip_first).click()
    page.wait_for_timeout(500)


@when("I click the confirm booking button")
def click_confirm(page):
    page.locator(book_confirm_button).click()
    page.wait_for_url(re.compile(r"/pogoda/beauty/bookings/\d+/success"), timeout=15000)
    page.wait_for_timeout(2000)


@then("I should land on the booking success page")
def verify_success_page(page):
    expect(page.locator(booking_success_page_root).first).to_be_visible()


@then("the booking success summary should mention the chosen service")
def verify_summary_has_service(page, e2e_state):
    expect(page.locator(success_summary_card)).to_be_visible()
    name = e2e_state.get("service_name") or ""
    if name:
        # Page text should contain the service name somewhere (in body / summary).
        body_text = page.content()
        assert name in body_text, (
            f"Expected service name {name!r} to appear on booking success page"
        )


@when("I click the view my bookings button")
def click_view_my_bookings(page):
    page.locator(view_my_bookings_button).click()
    page.wait_for_timeout(3000)


@then("I should land on the bookings list page")
def verify_bookings_list(page):
    expect(page.locator(bookings_page_root).first).to_be_visible()


@then("the new booking should be visible in the list")
def verify_booking_in_list(page):
    expect(page.locator(booking_card).first).to_be_visible()


@when("I tap the first booking in the list")
def tap_first_booking(page):
    page.locator(booking_title_button).first.click()
    page.wait_for_timeout(3000)


@then("the booking detail page should be visible")
def verify_detail_visible(page):
    expect(page.locator(booking_detail_page_root).first).to_be_visible()


@then("the booking detail cancel button should be visible")
def verify_cancel_visible(page):
    expect(page.locator(detail_cancel_button)).to_be_visible()
