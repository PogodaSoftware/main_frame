"""Steps for the Beauty Search → Provider link feature.

Validates V13-V15: search result cards expose the owning business and,
when clicked, navigate the customer to that business's provider detail
page (/pogoda/beauty/providers/:id) where they can book a service.

The seed data lives in migration 0005_replace_categories — Glow Facial
Studio has the "Signature Facial" and "Brightening Peel" services. We
do NOT seed extra rows; we just exercise the existing catalog.
"""

from __future__ import annotations

import json
import re

from playwright.sync_api import expect
from pytest_bdd import scenarios, given, when, then, parsers

from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.pogoda.beauty.search_page import (
    search_input,
    search_result_card,
    search_result_business,
)
from Playwright.pages.pogoda.beauty.provider_detail_page import (
    hero_title,
    provider_page_root,
)

from ._auth_helpers import ui_login

scenarios("../../features/Beauty/beauty_search_provider_link.feature")


# ---------------------------------------------------------------------------
# Givens
# ---------------------------------------------------------------------------

@given(parsers.parse('an authenticated customer with city "{city}" is on the search page'))
def auth_customer_on_search(page, test_customer, city):
    page.add_init_script(
        f"window.localStorage.setItem('beauty_customer_city', {json.dumps(city)});"
    )
    ui_login(page, test_customer["email"], test_customer["password"])
    selecting_different_routes(page, 'beauty_search')
    page.wait_for_timeout(800)


# ---------------------------------------------------------------------------
# Whens
# ---------------------------------------------------------------------------

@when(parsers.parse('the customer types "{text}" in the search input'))
def type_query(page, text):
    box = page.locator(search_input)
    box.click()
    box.fill("")
    box.type(text, delay=20)
    page.wait_for_timeout(900)


@when("the customer clicks the first search result card")
def click_first_card(page):
    page.locator(search_result_card).first.scroll_into_view_if_needed()
    page.locator(search_result_card).first.click()
    page.wait_for_timeout(1200)


# ---------------------------------------------------------------------------
# Thens
# ---------------------------------------------------------------------------

@then(parsers.parse('a search result card for "{name}" should be visible'))
def card_visible(page, name):
    card = page.locator(search_result_card).filter(has_text=name).first
    expect(card).to_be_visible()


@then(parsers.parse('that result card should display the business "{biz}"'))
def card_shows_business(page, biz):
    label = page.locator(search_result_business).filter(has_text=biz).first
    expect(label).to_be_visible()


@then(parsers.parse('the URL should match "{fragment}"'))
def url_matches(page, fragment):
    pattern = re.escape(fragment) + r"\d+"
    expect(page).to_have_url(re.compile(pattern))


@then(parsers.parse('the provider detail page for "{biz}" should be visible'))
def provider_page_visible(page, biz):
    expect(page.locator(provider_page_root).first).to_be_visible()
    expect(page.locator(hero_title)).to_contain_text(biz)
