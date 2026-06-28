import re

from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.home_page import home_page_root

scenarios("../../features/Beauty/beauty_google_auth.feature")


@given("I open the customer login page for Google sign-in")
def open_customer_login(page):
    selecting_different_routes(page, 'beauty_login')
    timeout_for_testing(page)


@given("I open the business login page for Google sign-in")
def open_business_login(page):
    selecting_different_routes(page, 'beauty_business_login')
    timeout_for_testing(page)


@when("I continue with Google and pick the first customer account")
def google_pick_customer(page):
    page.get_by_role("button", name="Continue with Google").click()
    expect(page).to_have_url(re.compile(r"/auth/oauth/google/customer"))
    page.get_by_role("button", name=re.compile("Aisha Bell")).click()


@when("I continue with Google and pick the first business account")
def google_pick_business(page):
    page.get_by_role("button", name="Continue with Google").click()
    expect(page).to_have_url(re.compile(r"/auth/oauth/google/business"))
    page.get_by_role("button", name=re.compile("Studio Luxe")).click()


@then("I should land authenticated on the customer home")
def assert_customer_home(page):
    # Mock cookie set → guard admits customer → home shell renders.
    expect(page).to_have_url(re.compile(r"/pogoda/beauty/?$"))
    expect(page.locator(home_page_root)).to_be_visible()


@then("I should land in the business portal")
def assert_business_portal(page):
    # Mock cookie set → business context (portal or onboarding), never bounced to login.
    expect(page).to_have_url(re.compile(r"/pogoda/beauty/business"))
