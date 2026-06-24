from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.pogoda.beauty.profile_page import (
    profile_page_root,
    display_name,
    info_card as profile_info_card,
    sign_out_button,
    top_nav_saved_btn,
)
from Playwright.pages.pogoda.beauty.favorites_page import (
    favorites_root,
)
from Playwright.pages.pogoda.beauty.welcome_page import (
    welcome_page_root,
    signin_button as welcome_signin_button,
)

from ._auth_helpers import ui_login

scenarios("../../features/Beauty/beauty_profile_page.feature")


@given("an authenticated customer is on the profile page")
def auth_customer_on_profile(page, test_customer):
    ui_login(page, test_customer["email"], test_customer["password"])
    selecting_different_routes(page, 'beauty_profile')
    page.wait_for_timeout(2000)


@then("the beauty profile page should be visible")
def verify_root(page):
    expect(page.locator(profile_page_root).first).to_be_visible()


@then("the profile display name should be visible")
def verify_display_name(page):
    expect(page.locator(display_name)).to_be_visible()


@then("the profile info card should be visible")
def verify_info_card(page):
    expect(page.locator(profile_info_card)).to_be_visible()


@then("the profile sign out button should be visible")
def verify_sign_out(page):
    expect(page.locator(sign_out_button)).to_be_visible()


@when("I click the top-nav Saved button")
def click_saved_nav(page):
    page.locator(top_nav_saved_btn).click()
    page.wait_for_timeout(1500)


@then("I should land on the saved services page")
def verify_saved_page(page):
    expect(page.locator(favorites_root)).to_be_visible()


@when("I click the profile sign out button")
def click_sign_out(page):
    page.locator(sign_out_button).click()
    # Sign-out is gated by a confirm modal — click the primary "Sign out" button.
    page.locator(
        "css=div.beauty-modal-backdrop button.beauty-modal-btn.primary"
    ).click()
    page.wait_for_timeout(3000)


@then("I should land on the welcome page")
def verify_welcome(page):
    expect(page.locator(welcome_page_root)).to_be_visible()


@then("the welcome sign in button should be visible on the welcome page")
def verify_welcome_signin(page):
    expect(page.locator(welcome_signin_button)).to_be_visible()
