from pytest_bdd import scenarios, given, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.pogoda.beauty.category_page import (
    category_page_root,
    hero as category_hero,
    services_title as category_services_title,
    service_row as category_service_row,
    book_button as category_book_button,
    bottom_nav as category_bottom_nav,
)

from ._auth_helpers import ui_login

scenarios("../../features/Pogoda/Beauty/beauty_category_page.feature")


@given("an authenticated customer is on the facial category page")
def auth_customer_on_facial_category(page, test_customer):
    ui_login(page, test_customer["email"], test_customer["password"])
    selecting_different_routes(page, 'beauty_category', slug='facial')
    page.wait_for_timeout(3000)


@then("the beauty category page should be visible")
def verify_category_root(page):
    expect(page.locator(category_page_root).first).to_be_visible()


@then("the category hero should be visible")
def verify_category_hero(page):
    expect(page.locator(category_hero)).to_be_visible()


@then("the category services title should be visible")
def verify_services_title(page):
    expect(page.locator(category_services_title)).to_be_visible()


@then("at least one category service row should be visible")
def verify_service_row(page):
    expect(page.locator(category_service_row).first).to_be_visible()


@then("at least one category book button should be visible")
def verify_book_button(page):
    expect(page.locator(category_book_button).first).to_be_visible()


@then("the category bottom nav should be visible")
def verify_bottom_nav(page):
    expect(page.locator(category_bottom_nav)).to_be_visible()
