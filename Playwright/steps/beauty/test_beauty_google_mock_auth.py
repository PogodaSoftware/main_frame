import re

from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.home_page import home_page_root

scenarios("../../features/Beauty/beauty_google_mock_auth.feature")

# Shared selectors — the Google CTA lives in the dynamic form; the chooser
# rows are rendered by BeautyGoogleAuthComponent.
GOOGLE_BUTTON = "css=button.btn-google"
CHOOSER_ROW = "css=button.goog-row"


@given("I navigate to the beauty login page")
def nav_login(page):
    selecting_different_routes(page, 'beauty_login')
    timeout_for_testing(page)


@given("I navigate to the beauty business login page")
def nav_business_login(page):
    selecting_different_routes(page, 'beauty_business_login')
    timeout_for_testing(page)


@when("I click continue with Google")
def click_google(page):
    page.locator(GOOGLE_BUTTON).click()
    # Wait for the BFF-driven chooser to render its account rows.
    expect(page.locator(CHOOSER_ROW).first).to_be_visible(timeout=6000)


@when("I pick the first Google account")
def pick_first_account(page):
    page.locator(CHOOSER_ROW).first.click()


@then("I should land on the authenticated customer home")
def on_customer_home(page):
    expect(page).to_have_url(re.compile(r"/pogoda/beauty/?$"), timeout=8000)
    expect(page.locator(home_page_root)).to_be_visible()


@then("I should land in the authenticated business area")
def in_business_area(page):
    # Session established → routed into /business/* (onboarding or portal),
    # NOT bounced back to the business login.
    expect(page).to_have_url(re.compile(r"/pogoda/beauty/business/"), timeout=8000)
    expect(page).not_to_have_url(re.compile(r"/business/login"))
