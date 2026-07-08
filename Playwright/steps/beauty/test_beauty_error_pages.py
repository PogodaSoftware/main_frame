from pytest_bdd import scenarios, given, then, parsers
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.error_page import (
    error_page_root,
    eyebrow as err_eyebrow,
    title as err_title,
    body as err_body,
    any_cta_button,
    primary_cta_button,
    secondary_cta_button,
    contact_support_link,
)

scenarios("../../features/Beauty/beauty_error_pages.feature")


@given(parsers.parse('I navigate to the beauty error route "{route}"'))
def navigate_to_error_route(page, route):
    selecting_different_routes(page, route)
    timeout_for_testing(page)


@then("the beauty error page should be visible")
def verify_error_visible(page):
    expect(page.locator(error_page_root)).to_be_visible()


@then(parsers.parse('the error eyebrow should display "{text}"'))
def verify_eyebrow_text(page, text):
    expect(page.locator(err_eyebrow)).to_have_text(text)


@then("the error title should be visible")
def verify_title(page):
    expect(page.locator(err_title)).to_be_visible()


@then("the error body should be visible")
def verify_body(page):
    expect(page.locator(err_body)).to_be_visible()


@then("the error action button should be visible")
def verify_any_cta(page):
    """At least one CTA button present on every variant."""
    expect(page.locator(any_cta_button).first).to_be_visible()


@then("the error primary CTA button should be visible")
def verify_primary_cta(page):
    expect(page.locator(primary_cta_button)).to_be_visible()


@then("the error secondary CTA button should be visible")
def verify_secondary_cta(page):
    expect(page.locator(secondary_cta_button)).to_be_visible()


@then("the error contact support button should be visible")
def verify_contact_support(page):
    expect(page.locator(contact_support_link)).to_be_visible()
