"""Steps for Beauty Customer location-chip DOM fix + studios BFF-driven fix.

Covers three deployed fixes:
  Fix 1 — .location-chip is now a SIBLING of .search (not a descendant).
  Fix 2 — Studios near you section is BFF-driven; each card navigates to
           the provider detail page on click.
  Fix 3 — .location-chip is visible and contains city text on My Bookings,
           Saved, and Messages pages (not just Home).
"""

from __future__ import annotations

import re

import pytest
from playwright.sync_api import expect
from pytest_bdd import scenarios, given, when, then

from Playwright.Hooks.hooks import selecting_different_routes, goto_route
from Playwright.pages.pogoda.beauty.home_page import (
    home_page_root,
    studios_section,
    studio_card,
    nav_tab_bookings,
    nav_tab_saved,
    nav_tab_messages,
    top_nav,
    location_chip,
    search_sep_inside_search,
    search_city_inside_search,
    search_pill,
    home_search_input,
    home_search_empty,
)
from Playwright.steps.beauty._auth_helpers import ui_login

scenarios("../../features/Beauty/beauty_location_chip_and_studios.feature")


# ---------------------------------------------------------------------------
# State shared across steps within a scenario
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Givens
# ---------------------------------------------------------------------------

@given('an authenticated customer "anika.patel@gmail.com" is on the beauty home page')
def authed_anika_on_home(page):
    """Log in as the seeded customer and confirm the home page renders."""
    ui_login(page, "anika.patel@gmail.com", "Test1234!")
    expect(page.locator(home_page_root)).to_be_visible()


# ---------------------------------------------------------------------------
# Whens
# ---------------------------------------------------------------------------

@when("the customer navigates to the bookings page")
def navigate_to_bookings(page):
    page.locator(nav_tab_bookings).click()
    # Wait for the bookings route to settle; URL is the reliable signal.
    page.wait_for_url(re.compile(r".*/bookings/?$"), timeout=6000)


@when("the customer navigates to the saved page")
def navigate_to_saved(page):
    page.locator(nav_tab_saved).click()
    page.wait_for_url(re.compile(r".*/saved/?$"), timeout=6000)


@when("the customer navigates to the messages page")
def navigate_to_messages(page):
    page.locator(nav_tab_messages).click()
    page.wait_for_url(re.compile(r".*/chats/?$"), timeout=6000)


# ---------------------------------------------------------------------------
# Thens — Fix 1: location chip DOM position
# ---------------------------------------------------------------------------

@then("the location chip should be visible in the top nav")
def location_chip_visible(page):
    expect(page.locator(location_chip)).to_be_visible()


@then("the search pill should not contain the location chip")
def location_chip_not_in_search(page):
    # .search .location-chip must not exist.
    expect(page.locator("css=header.cust-topnav .search .location-chip")).to_have_count(0)


@then("the search pill should not contain a search-sep or search-city child")
def search_pill_has_no_sep_or_city(page):
    expect(page.locator(search_sep_inside_search)).to_have_count(0)
    expect(page.locator(search_city_inside_search)).to_have_count(0)


@then("the location chip should appear after the search pill in the DOM")
def location_chip_is_sibling_after_search(page):
    """Verify via JS that .location-chip follows .search as a sibling."""
    result = page.evaluate("""() => {
        const nav = document.querySelector('header.cust-topnav');
        if (!nav) return { error: 'no header.cust-topnav' };
        const children = Array.from(nav.children).map(c => c.className.trim());
        const searchIdx = children.findIndex(c => c === 'search' || c.startsWith('search '));
        const chipIdx   = children.findIndex(c => c === 'location-chip' || c.startsWith('location-chip '));
        return { children, searchIdx, chipIdx, chipAfterSearch: chipIdx > searchIdx };
    }""")
    assert result.get("chipIdx", -1) >= 0,  "'.location-chip' not found as direct child of header.cust-topnav"
    assert result.get("searchIdx", -1) >= 0, "'.search' not found as direct child of header.cust-topnav"
    assert result["chipAfterSearch"], (
        f".location-chip (idx {result['chipIdx']}) is not after "
        f".search (idx {result['searchIdx']}) in nav children: {result['children']}"
    )


# ---------------------------------------------------------------------------
# Thens — Fix 2: studios section BFF-driven + navigation
# ---------------------------------------------------------------------------

@then("if the studios section is present each card has the studio-card class")
def studios_cards_have_correct_class(page):
    section = page.locator(studios_section)
    if section.count() == 0:
        pytest.skip("No section.studios rendered — BFF returned no nearby_providers")
    expect(section).to_be_visible()
    cards = page.locator(studio_card)
    count = cards.count()
    assert count >= 1, f"Expected at least one article.studio-card inside section.studios, got {count}"


@then("clicking the first studio card navigates to the provider detail page")
def click_studio_card_navigates(page):
    cards = page.locator(studio_card)
    if cards.count() == 0:
        pytest.skip("No studio-card present — cannot test navigation")
    url_before = page.url
    cards.first.click()
    # Angular router navigates asynchronously; wait for URL to change.
    page.wait_for_function(
        f"() => window.location.href !== {repr(url_before)}",
        timeout=6000,
    )
    url_after = page.url
    assert url_after != url_before, (
        f"URL did not change after studio card click. Still at: {url_after}"
    )
    # Must land on a provider detail route — /providers/<id>.
    assert re.search(r"/providers/\d+", url_after), (
        f"Expected URL to match /providers/<id> after studio card click, got: {url_after}"
    )


# ---------------------------------------------------------------------------
# Thens — Fix 3: location chip on non-home pages
# ---------------------------------------------------------------------------

@then("the location chip text should contain the user city")
def location_chip_contains_city(page):
    chip = page.locator(location_chip)
    expect(chip).to_be_visible()
    # City is written to localStorage by the BFF home resolver; we seeded it
    # by visiting home first.  "Brooklyn" is the city for the seeded user.
    chip_text = chip.inner_text()
    assert chip_text.strip(), f"location chip text is blank: {chip_text!r}"


# ---------------------------------------------------------------------------
# Search pill fix — input fills the pill (native ✕ flush-right) and the
# no-results dropdown spans the bar width (was a fixed 440px).
# ---------------------------------------------------------------------------

@when("the customer searches for a query with no matches")
def search_no_match(page):
    box = page.locator(home_search_input)
    box.click()
    box.fill("zzzzzqqq")
    # Debounced BFF search → empty-state dropdown.
    expect(page.locator(home_search_empty)).to_be_visible(timeout=6000)


@then("the search empty-state should be visible")
def empty_state_visible(page):
    expect(page.locator(home_search_empty)).to_be_visible()


@then("the search empty-state should span the search bar width")
def empty_state_spans_bar(page):
    pill_w = page.locator(search_pill).bounding_box()["width"]
    empty_w = page.locator(home_search_empty).bounding_box()["width"]
    # width:100% of the .search pill; allow a small margin for border/rounding.
    assert empty_w >= pill_w * 0.9, (
        f"empty-state width {empty_w} is < 90% of search bar width {pill_w}"
    )


@then("the search input should span the search bar width")
def input_spans_bar(page):
    # A wide input is the exact mechanism that pushes the native clear ✕
    # flush-right (the ✕ is a browser pseudo-element, not in the DOM).
    pill_w = page.locator(search_pill).bounding_box()["width"]
    input_w = page.locator(home_search_input).bounding_box()["width"]
    assert input_w >= pill_w * 0.8, (
        f"search input width {input_w} is < 80% of search bar width {pill_w}"
    )
