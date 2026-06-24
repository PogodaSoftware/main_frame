from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.welcome_page import (
    welcome_page_root,
    brand_block,
    signin_button as welcome_signin_button,
    signup_button as welcome_signup_button,
    google_button as welcome_google_button,
)
from Playwright.pages.pogoda.beauty.login_page import login_page_root
from Playwright.pages.pogoda.beauty.signup_page import signup_page_root

scenarios("../../features/Beauty/beauty_welcome_page.feature")


@given("I navigate to the beauty welcome page")
def navigate_to_welcome(page):
    selecting_different_routes(page, 'beauty_welcome')
    timeout_for_testing(page)


@then("the beauty welcome page should be visible")
def verify_welcome_visible(page):
    expect(page.locator(welcome_page_root)).to_be_visible()


@then("the welcome brand block should be visible")
def verify_brand_block(page):
    expect(page.locator(brand_block)).to_be_visible()


@then("the welcome sign in button should be visible on the welcome page")
def verify_welcome_signin_visible(page):
    expect(page.locator(welcome_signin_button)).to_be_visible()


@then("the welcome create account button should be visible")
def verify_welcome_signup_visible(page):
    expect(page.locator(welcome_signup_button)).to_be_visible()


@then("the welcome google button should be visible")
def verify_welcome_google_visible(page):
    expect(page.locator(welcome_google_button)).to_be_visible()


@when("I click the welcome sign in button")
def click_welcome_signin(page):
    page.locator(welcome_signin_button).click()
    page.wait_for_timeout(2000)


@when("I click the welcome create account button")
def click_welcome_signup(page):
    page.locator(welcome_signup_button).click()
    page.wait_for_timeout(2000)


@then("I should land on the beauty login page")
def verify_login_visible(page):
    expect(page.locator(login_page_root)).to_be_visible()


@then("I should land on the beauty signup page")
def verify_signup_visible(page):
    expect(page.locator(signup_page_root)).to_be_visible()


@given("I view the beauty welcome page at a 390px mobile width")
def navigate_to_welcome_mobile(page):
    page.set_viewport_size({"width": 390, "height": 844})
    selecting_different_routes(page, 'beauty_welcome')
    timeout_for_testing(page)


@then("the welcome page should not scroll horizontally")
def welcome_no_horizontal_scroll(page):
    overflow = page.evaluate(
        "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
    )
    assert overflow <= 1, f"welcome page scrolls horizontally by {overflow}px at 390px"


@then("the welcome sign in button should span the mobile content width")
def welcome_cta_full_width(page):
    btn_w = page.locator(welcome_signin_button).bounding_box()["width"]
    # Full-width CTA: ~viewport minus pane padding; allow margin.
    assert btn_w >= 390 * 0.8, f"sign-in CTA only {btn_w}px wide at 390px viewport"
