import pytest
from pytest_bdd import scenarios, given, then, parsers
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.signup_page import (
    signup_page_root,
    signup_title,
    email_input,
    password_input,
    password_toggle_button,
    submit_button,
    signin_link_button,
)

scenarios("../../features/Beauty/beauty_signup_page.feature")


@pytest.fixture

@given("I navigate to the beauty signup page")
def navigate_to_beauty_signup(page):
    selecting_different_routes(page, 'beauty_signup')
    timeout_for_testing(page)


@then("the beauty signup page should be visible")
def verify_signup_page_visible(page):
    expect(page.locator(signup_page_root)).to_be_visible()


@given("I view the beauty signup page at a 390px mobile width")
def navigate_signup_mobile(page):
    page.set_viewport_size({"width": 390, "height": 844})
    selecting_different_routes(page, 'beauty_signup')
    timeout_for_testing(page)


@then("the signup page should not scroll horizontally")
def signup_no_horizontal_scroll(page):
    overflow = page.evaluate(
        "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
    )
    assert overflow <= 1, f"signup page scrolls horizontally by {overflow}px at 390px"


@then("the signup submit button should span the mobile content width")
def signup_submit_full_width(page):
    w = page.locator(submit_button).bounding_box()["width"]
    assert w >= 390 * 0.8, f"submit button only {w}px wide at 390px viewport"


@then("the signup inputs should be at least 44px tall")
def signup_inputs_tall(page):
    h = page.locator(email_input).bounding_box()["height"]
    assert h >= 43, f"signup input only {h}px tall at 390px (expected ~44px touch target)"


@then(parsers.parse('the signup title should display "{title}"'))
def verify_signup_title(page, title):
    expect(page.locator(signup_title)).to_have_text(title)


@then("the signup email input field should be visible")
def verify_signup_email_input(page):
    expect(page.locator(email_input)).to_be_visible()


@then("the signup password input field should be visible")
def verify_signup_password_input(page):
    expect(page.locator(password_input)).to_be_visible()


@then("the signup password toggle button should be visible")
def verify_signup_password_toggle(page):
    expect(page.locator(password_toggle_button)).to_be_visible()


@then("the continue submit button should be visible")
def verify_continue_button(page):
    expect(page.locator(submit_button)).to_be_visible()


@then("the sign in navigation link should be visible on the signup page")
def verify_signin_nav_link_on_signup(page):
    expect(page.locator(signin_link_button)).to_be_visible()
