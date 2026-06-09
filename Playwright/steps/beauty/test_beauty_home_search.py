"""Steps for the Beauty Customer Home Search Bar feature.

Covers V1-V12 from the home-page search handoff:
presence above carousel, debounce, real-data, proximity ordering,
result→service-detail navigation, payload fidelity, accessibility,
500/429 toasts, and responsive layout.

V8 (visual regression) is intentionally omitted — there is no MCP
visual baseline registered in the repo yet.
"""

from __future__ import annotations

import json
import re
import subprocess
import time

import pytest
from playwright.sync_api import expect
from pytest_bdd import scenarios, given, when, then, parsers

from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.pogoda.beauty.home_page import (
    home_carousel,
    home_search_section,
    home_search_input,
    home_search_status,
    home_search_results,
    home_search_result_card,
    home_search_empty,
    home_search_rate_toast,
    home_search_error_toast,
    home_pagination_next,
    home_pagination_prev,
    home_pagination_numbers,
)

from ._auth_helpers import ui_login

scenarios("../../features/Beauty/beauty_home_search.feature")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seed_service(*, provider_name: str, service_name: str, location: str,
                  category: str = "nails", is_future: bool = False) -> None:
    cmd = (
        "from beauty_api.models import BeautyProvider, BeautyService; "
        f"p, _ = BeautyProvider.objects.get_or_create(name='{provider_name}', "
        f"defaults={{'location_label': '{location}'}}); "
        f"BeautyService.objects.create("
        f"  provider=p, name='{service_name}', category='{category}', "
        f"  description='Home search seed', price_cents=5500, "
        f"  duration_minutes=60, "
        f"  service_locations=['{location}'], is_future={is_future})"
    )
    subprocess.run(
        ["docker", "exec", "main_frame-backend-1",
         "python", "manage.py", "shell", "-c", cmd],
        capture_output=True, timeout=30,
    )


def _cleanup() -> None:
    cmd = (
        "from beauty_api.models import BeautyProvider; "
        "BeautyProvider.objects.filter(name__startswith='HomeSearch').delete()"
    )
    subprocess.run(
        ["docker", "exec", "main_frame-backend-1",
         "python", "manage.py", "shell", "-c", cmd],
        capture_output=True, timeout=30,
    )


def _is_search_url(url: str) -> bool:
    return "/api/beauty/services/search/" in url


def _mock_response(page, payload: dict, status_code: int = 200) -> None:
    body = json.dumps(payload)

    def _route(route):
        if _is_search_url(route.request.url):
            route.fulfill(
                status=status_code,
                content_type="application/json",
                body=body,
            )
        else:
            route.continue_()

    page.route("**/api/beauty/services/search/**", _route)


# ---------------------------------------------------------------------------
# Givens
# ---------------------------------------------------------------------------

@given(parsers.parse('an authenticated customer with city "{city}" is on the home page'))
def home_page_with_city(page, test_customer, city):
    page.add_init_script(
        f"window.localStorage.setItem('beauty_customer_city', {json.dumps(city)});"
    )
    ui_login(page, test_customer["email"], test_customer["password"])
    page.search_requests = []  # type: ignore[attr-defined]

    def _on_request(req):
        if _is_search_url(req.url):
            page.search_requests.append({  # type: ignore[attr-defined]
                "url": req.url, "ts": time.monotonic(),
            })

    page.on("request", _on_request)


@given(parsers.parse('a service named "{svc}" exists in "{city}"'))
def seed_keyword(svc, city):
    _seed_service(
        provider_name=f"HomeSearch {svc[:8]}",
        service_name=svc,
        location=city,
    )


@given("the search backend returns two mocked nail spas with distances 5 and 15")
def mock_two_nail_spas(page):
    payload = {
        "items": [
            {
                "id": 101, "name": "Nail Spa A",
                "description": "Closer", "price_cents": 5000,
                "duration_minutes": 60, "category": "nails",
                "is_future": False, "service_locations": ["Seattle"],
                "distance_km": 5,
                "provider": {
                    "id": 1, "name": "Spa A",
                    "short_description": "", "location_label": "Seattle",
                },
            },
            {
                "id": 102, "name": "Nail Spa B",
                "description": "Farther", "price_cents": 5000,
                "duration_minutes": 60, "category": "nails",
                "is_future": False, "service_locations": ["Bellevue"],
                "distance_km": 15,
                "provider": {
                    "id": 2, "name": "Spa B",
                    "short_description": "", "location_label": "Bellevue",
                },
            },
        ],
        "next_offset": None,
        "has_more": False,
    }
    _mock_response(page, payload, 200)


@given(parsers.parse("the search backend returns a single mocked service with id {sid:d}"))
def mock_single_service(page, sid):
    payload = {
        "items": [
            {
                "id": sid, "name": "Nail Spa Mock",
                "description": "Mock service", "price_cents": 5000,
                "duration_minutes": 60, "category": "nails",
                "is_future": False, "service_locations": ["Seattle"],
                "distance_km": 0,
                "provider": {
                    "id": 1, "name": "Mock Provider",
                    "short_description": "", "location_label": "Seattle",
                },
            },
        ],
        "next_offset": None,
        "has_more": False,
    }
    _mock_response(page, payload, 200)
    # Also short-circuit the BFF resolve for beauty_book screen so the
    # mocked (and thus non-existent) service id does not redirect back to
    # the home page. We only intercept resolve calls whose payload targets
    # this screen + service id; everything else passes through.
    book_envelope = {
        "action": "render",
        "screen": "beauty_book",
        "data": {
            "service": {"id": sid, "name": "Nail Spa Mock"},
            "provider": {"id": 1, "name": "Mock Provider"},
            "form": {"fields": [], "submit_label": "Confirm booking"},
        },
        "meta": {"title": "Book"},
        "_links": {},
    }
    book_body = json.dumps(book_envelope)

    def _bff_route(route):
        req = route.request
        try:
            body = req.post_data_json or {}
        except Exception:
            body = {}
        if body.get("screen") == "beauty_book" and \
           str((body.get("params") or {}).get("serviceId")) == str(sid):
            route.fulfill(
                status=200,
                content_type="application/json",
                body=book_body,
            )
        else:
            route.continue_()

    page.route("**/api/bff/beauty/resolve/**", _bff_route)


# ---------------------------------------------------------------------------
# Whens
# ---------------------------------------------------------------------------

@when(parsers.re(r'the customer types "(?P<first>[^"]+)" then "(?P<rest>[^"]+)" in the home search input'))
def type_in_two_bursts(page, first, rest):
    box = page.locator(home_search_input)
    expect(box).to_be_visible()
    box.click()
    box.fill("")
    box.type(first, delay=10)
    page.wait_for_timeout(120)  # under 300ms debounce window
    box.type(rest, delay=10)
    page.wait_for_timeout(900)


@when(parsers.re(r'the customer types "(?P<text>[^"]+)" in the home search input'))
def type_query(page, text):
    box = page.locator(home_search_input)
    box.click()
    box.fill("")
    box.type(text, delay=20)
    page.wait_for_timeout(900)


@when("the customer clicks the first home search result card")
def click_first_card(page):
    page.locator(home_search_result_card).first.locator("button").first.click()
    page.wait_for_timeout(800)


@when("the home search backend returns 500 for the next request")
def force_500(page):
    _mock_response(page, {"detail": "boom"}, 500)


@when("the home search backend returns 429 for the next request")
def force_429(page):
    _mock_response(page, {"detail": "Too many"}, 429)


@when("the viewport is resized to mobile width")
def resize_mobile(page):
    page.set_viewport_size({"width": 375, "height": 720})
    page.wait_for_timeout(300)


@when("the viewport is resized to desktop width")
def resize_desktop(page):
    page.set_viewport_size({"width": 1280, "height": 900})
    page.wait_for_timeout(300)


# ---------------------------------------------------------------------------
# Thens
# ---------------------------------------------------------------------------

@then("the home search bar should be visible")
def search_bar_visible(page):
    expect(page.locator(home_search_section)).to_be_visible()
    expect(page.locator(home_search_input)).to_be_visible()


@then("the home search bar should appear above the home carousel")
def bar_above_carousel(page):
    bar = page.locator(home_search_section).first
    carousel = page.locator(home_carousel).first
    expect(bar).to_be_visible()
    expect(carousel).to_be_visible()
    bar_top = bar.bounding_box()["y"]
    car_top = carousel.bounding_box()["y"]
    assert bar_top < car_top, (
        f"search bar (y={bar_top}) is not above the carousel (y={car_top})"
    )


@then("no home pagination controls should be visible")
def no_pagination(page):
    for selector in (home_pagination_next, home_pagination_prev, home_pagination_numbers):
        expect(page.locator(selector)).to_have_count(0)


@then("exactly one debounced home search request should be sent")
def one_debounced(page):
    typed = [
        r for r in page.search_requests  # type: ignore[attr-defined]
        if re.search(r"[?&]q=nails", r["url"], flags=re.I)
    ]
    assert len(typed) == 1, (
        f"Expected one debounced /search request for q=nails, got {len(typed)}: "
        f"{[r['url'] for r in typed]}"
    )


@then("at least one home search result card should be visible")
def at_least_one_card(page):
    expect(page.locator(home_search_result_card).first).to_be_visible()


@then(parsers.parse('the visible home results should include "{needle}"'))
def results_include(page, needle):
    expect(page.locator(home_search_results)).to_contain_text(needle)


@then(parsers.parse('the first home search result should be "{name}"'))
def first_result_name(page, name):
    expect(page.locator(home_search_result_card).first).to_contain_text(name)


@then(parsers.parse("the first home result card data-distance should be {dist:d}"))
def first_card_distance(page, dist):
    actual = page.locator(home_search_result_card).first.get_attribute("data-distance")
    assert actual == str(dist), (
        f"Expected data-distance={dist}, got {actual!r}"
    )


@then(parsers.parse("the URL should be the service detail route for service {sid:d}"))
def url_service_detail(page, sid):
    expect(page).to_have_url(re.compile(rf".*/book/{sid}(?:[/?#].*)?$"))


@then("exactly one home search result card should be rendered")
def exactly_one_card(page):
    expect(page.locator(home_search_result_card)).to_have_count(1)


@then("the home search input should have an accessible label")
def input_a11y(page):
    box = page.locator(home_search_input)
    label = box.get_attribute("aria-label") or ""
    assert label.strip(), "home search input is missing aria-label"
    box.focus()
    expect(box).to_be_focused()


@then("the home search status should announce updates politely")
def status_aria(page):
    # Type something to make the status node render.
    box = page.locator(home_search_input)
    box.click()
    box.fill("a")
    page.wait_for_timeout(400)
    expect(page.locator(home_search_status)).to_have_attribute("aria-live", "polite")


@then("the home search error toast should be visible")
def error_toast_visible(page):
    expect(page.locator(home_search_error_toast)).to_be_visible()


@then("the home search rate-limit toast should be visible")
def rate_toast_visible(page):
    expect(page.locator(home_search_rate_toast)).to_be_visible()


@pytest.fixture(autouse=True)
def _cleanup_after_test():
    yield
    try:
        _cleanup()
    except Exception:
        pass
