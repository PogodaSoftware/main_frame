from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.pogoda.beauty.book_page import (
    book_page_root,
    sub_header_title as book_sub_header_title,
    hero as book_hero,
    title as book_title,
    day_chip,
    day_chip_first,
    time_chip,
    time_chip_first,
    provider_card,
    confirm_button,
    bottom_nav as book_bottom_nav,
)

from ._auth_helpers import ui_login

scenarios("../../features/Pogoda/Beauty/beauty_book_page.feature")


# Service id 10 = "Signature Facial" (provider 5).
_SERVICE_ID = 10


@given("an authenticated customer is on a service book page")
def auth_customer_on_book_page(page, test_customer):
    ui_login(page, test_customer["email"], test_customer["password"])
    selecting_different_routes(page, 'beauty_book', serviceId=_SERVICE_ID)
    page.wait_for_timeout(3000)


@then("the beauty book page should be visible")
def verify_book_root(page):
    expect(page.locator(book_page_root).first).to_be_visible()


@then("the book sub-header title should be visible")
def verify_sub_header(page):
    expect(page.locator(book_sub_header_title)).to_be_visible()


@then("the book hero should be visible")
def verify_book_hero(page):
    expect(page.locator(book_hero)).to_be_visible()


@then("the book service title should be visible")
def verify_book_title(page):
    expect(page.locator(book_title)).to_be_visible()


@then("at least one day chip should be visible")
def verify_day_chip(page):
    expect(page.locator(day_chip).first).to_be_visible()


@then("at least one time chip should be visible")
def verify_time_chip(page):
    expect(page.locator(time_chip).first).to_be_visible()


@then("the book provider card should be visible")
def verify_provider_card(page):
    expect(page.locator(provider_card)).to_be_visible()


@then("the book confirm button should be visible")
def verify_confirm_button(page):
    expect(page.locator(confirm_button)).to_be_visible()


@then("the book bottom nav should be visible")
def verify_bottom_nav(page):
    expect(page.locator(book_bottom_nav)).to_be_visible()


@when("I select the first available day chip")
def select_first_day_chip(page):
    page.locator(day_chip_first).click()
    page.wait_for_timeout(500)


@when("I select the first available time chip")
def select_first_time_chip(page):
    page.locator(time_chip_first).click()
    page.wait_for_timeout(500)


@then("the book confirm button should be enabled")
def verify_confirm_enabled(page):
    expect(page.locator(confirm_button)).to_be_enabled()
