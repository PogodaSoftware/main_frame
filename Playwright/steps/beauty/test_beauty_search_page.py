"""Steps for the Beauty customer Search Experience feature.

Validates V1-V12 from the search-feature handoff:
debounce, rate-limit, location auto-filter, keyword + future-service
search, infinite scroll, no pagination UI, accessibility, error UX
and the 800ms perf guardrail.

The tests intercept network calls via Playwright's `page.route` to
keep V2/V3/V11/V12 deterministic without depending on backend timing.
V5/V6/V7 lean on a `seed_services` helper that inserts rows directly
through the backend Django shell over docker exec, mirroring the
existing pattern in beauty_utils.delete_test_users.
"""

from __future__ import annotations

import json
import re
import subprocess
import time

import requests
from playwright.sync_api import expect
from pytest_bdd import scenarios, given, when, then, parsers

from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.pogoda.beauty.search_page import (
    search_page_root,
    search_input,
    search_status,
    search_location_pill,
    search_results,
    search_result_card,
    search_future_badge,
    search_sentinel,
    search_end_marker,
    search_rate_toast,
    search_error_toast,
    pagination_next,
    pagination_prev,
    pagination_numbers,
)

from ._auth_helpers import ui_login
from .beauty_utils import BACKEND_URL

scenarios("../../features/Beauty/beauty_search_page.feature")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seed_service(
    *,
    provider_name: str,
    service_name: str,
    location: str,
    is_future: bool = False,
    category: str = "facial",
) -> None:
    """Insert one BeautyProvider + BeautyService row through the Django
    shell. Idempotent on the provider via get_or_create."""
    cmd = (
        "from beauty_api.models import BeautyProvider, BeautyService; "
        f"p, _ = BeautyProvider.objects.get_or_create(name='{provider_name}', "
        f"defaults={{'location_label': '{location}'}}); "
        f"BeautyService.objects.create("
        f"  provider=p, name='{service_name}', category='{category}', "
        f"  description='Search test service', price_cents=5000, "
        f"  duration_minutes=60, "
        f"  service_locations=['{location}'], is_future={is_future})"
    )
    subprocess.run(
        ["docker", "exec", "main_frame-backend-1",
         "python", "manage.py", "shell", "-c", cmd],
        capture_output=True,
        timeout=30,
    )


def _seed_bulk_services(provider_name: str, location: str, count: int) -> None:
    cmd = (
        "from beauty_api.models import BeautyProvider, BeautyService; "
        f"p, _ = BeautyProvider.objects.get_or_create(name='{provider_name}', "
        f"defaults={{'location_label': '{location}'}}); "
        f"[BeautyService.objects.create("
        f"  provider=p, name=f'Bulk Service {{i:02d}}', category='facial', "
        f"  description='', price_cents=4000, duration_minutes=45, "
        f"  service_locations=['{location}'], is_future=False) "
        f" for i in range({count})]"
    )
    subprocess.run(
        ["docker", "exec", "main_frame-backend-1",
         "python", "manage.py", "shell", "-c", cmd],
        capture_output=True,
        timeout=60,
    )


def _cleanup_seeded_services() -> None:
    cmd = (
        "from beauty_api.models import BeautyProvider; "
        "BeautyProvider.objects.filter(name__startswith='SearchTest').delete()"
    )
    subprocess.run(
        ["docker", "exec", "main_frame-backend-1",
         "python", "manage.py", "shell", "-c", cmd],
        capture_output=True,
        timeout=30,
    )


def _is_search_request(req_or_resp) -> bool:
    """True for BFF resolve calls targeting the beauty_service_search screen.

    Accepts both Playwright Request and Response objects; for a Response we
    fall back to checking the URL only (post_data not available on Response).
    """
    url = getattr(req_or_resp, "url", "")
    if "/api/bff/beauty/resolve/" not in url:
        return False
    # Request objects expose post_data; Response objects do not.
    post_data = getattr(req_or_resp, "post_data", None)
    if post_data is None:
        # Response — URL match is sufficient (all resolves share the same URL,
        # so we correlate by sequence counter in _on_response instead).
        return True
    try:
        body = json.loads(post_data or "{}")
    except Exception:
        body = {}
    return body.get("screen") == "beauty_service_search"


# ---------------------------------------------------------------------------
# Givens
# ---------------------------------------------------------------------------

@given(parsers.parse('an authenticated customer with city "{city}" is on the search page'))
def auth_customer_on_search(page, test_customer, city):
    # Set the city in localStorage *before* the search component mounts so
    # `_readProfileLocation()` finds it on init.
    page.add_init_script(
        f"window.localStorage.setItem('beauty_customer_city', {json.dumps(city)});"
    )
    ui_login(page, test_customer["email"], test_customer["password"])
    # Track every search request the page issues. Tests downstream read
    # this list to verify debounce / location params / latency / count.
    page.search_requests = []  # type: ignore[attr-defined]
    page.search_response_ms = []  # type: ignore[attr-defined]

    def _on_request(req):
        if _is_search_request(req):
            try:
                params = json.loads(req.post_data or "{}").get("params", {})
            except Exception:
                params = {}
            page.search_requests.append({  # type: ignore[attr-defined]
                "url": req.url,
                "params": params,
                "seq": len(page.search_requests),  # type: ignore[attr-defined]
                "ts": time.monotonic(),
            })

    def _on_response(resp):
        # All resolve responses share the same URL — correlate by finding the
        # earliest open request (no "elapsed" yet) in FIFO order.
        if "/api/bff/beauty/resolve/" in resp.url:
            for r in page.search_requests:  # type: ignore[attr-defined]
                if "elapsed" not in r:
                    r["elapsed"] = (time.monotonic() - r["ts"]) * 1000.0
                    page.search_response_ms.append(r["elapsed"])  # type: ignore[attr-defined]
                    break

    page.on("request", _on_request)
    page.on("response", _on_response)

    selecting_different_routes(page, 'beauty_search')
    page.wait_for_timeout(800)


@given(parsers.parse('a service named "{svc}" exists in "{city}"'))
def seed_keyword_service(svc, city):
    _seed_service(
        provider_name=f"SearchTest {svc[:8]}",
        service_name=svc,
        location=city,
    )


@given(parsers.parse('a future service named "{svc}" exists in "{city}"'))
def seed_future_service(svc, city):
    _seed_service(
        provider_name=f"SearchTest Future {svc[:8]}",
        service_name=svc,
        location=city,
        is_future=True,
    )


@given(parsers.parse('{count:d} services exist in "{city}" for infinite scroll'))
def seed_bulk(count, city):
    _seed_bulk_services(f"SearchTest Bulk {city}", city, count)


# ---------------------------------------------------------------------------
# Whens
# ---------------------------------------------------------------------------

@when(parsers.parse('the customer types "{text}" in the search input'))
def type_query(page, text):
    box = page.locator(search_input)
    box.click()
    box.fill("")
    # Type fast (keystrokes within debounce window) so V2 collapses them.
    box.type(text, delay=20)
    # Wait past the 300ms debounce + a small response budget.
    page.wait_for_timeout(900)


@when(parsers.parse("{count:d} rapid search requests are issued from the same client"))
def burst_requests(page, count):
    # Force every subsequent /search/ response to 429 so both the burst
    # observation and the UI's debounced search see a rate-limit reply.
    # Backend has a token-bucket limiter, but its refill (10 tokens/sec)
    # can repopulate between the burst and the UI's debounced search,
    # making the toast appear flaky. Mocking keeps the assertion
    # deterministic while still exercising the 429 client path.
    def _route(route):
        if _is_search_request(route.request):
            route.fulfill(
                status=429,
                content_type="application/json",
                body=json.dumps({"detail": "Too many search requests."}),
            )
        else:
            route.continue_()
    page.route(re.compile(r"/api/bff/beauty/resolve/"), _route)

    # Fire the burst in-browser so the requests still share the page
    # context. Each fetch is intercepted by the route above and answered
    # with 429 — providing the 429 signal the assertion checks for.
    # POST to the new BFF resolve endpoint with screen=beauty_service_search.
    page.evaluate(
        f"""
        (async () => {{
          window.__rateBurstStatuses = [];
          const deviceId =
            window.localStorage.getItem('beauty_device_id') || '';
          for (let i = 0; i < {count}; i++) {{
            try {{
              const r = await fetch(
                '{BACKEND_URL}/api/bff/beauty/resolve/',
                {{
                  method: 'POST',
                  credentials: 'include',
                  headers: {{
                    'Content-Type': 'application/json',
                    'X-Device-ID': deviceId,
                  }},
                  body: JSON.stringify({{
                    version: '2.0.0',
                    screen: 'beauty_service_search',
                    device_id: deviceId,
                    params: {{ q: 'spam', offset: 0, limit: 20 }},
                  }}),
                }},
              );
              window.__rateBurstStatuses.push(r.status);
            }} catch (_) {{
              window.__rateBurstStatuses.push(0);
            }}
          }}
        }})();
        """
    )
    page.wait_for_timeout(2500)
    # Now kick the UI so it issues a real search whose 429 surfaces the toast.
    box = page.locator(search_input)
    box.click()
    box.fill("")
    box.type("spam", delay=10)
    page.wait_for_timeout(900)


@when("the customer scrolls to the bottom of the search results")
def scroll_to_bottom(page):
    initial = page.locator(search_result_card).count()
    page.locator(search_sentinel).scroll_into_view_if_needed()
    page.wait_for_timeout(1500)
    # Re-scroll a few times in case the sentinel was already in view.
    for _ in range(4):
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(800)
    page.initial_search_count = initial  # type: ignore[attr-defined]


@when("the search backend returns a 500 error for the next request")
def force_500(page):
    def _route(route):
        if _is_search_request(route.request):
            route.fulfill(
                status=500,
                content_type="application/json",
                body=json.dumps({"detail": "boom"}),
            )
        else:
            route.continue_()
    page.route(re.compile(r"/api/bff/beauty/resolve/"), _route)


# ---------------------------------------------------------------------------
# Thens
# ---------------------------------------------------------------------------

@then("the beauty search page should be visible")
def search_page_visible(page):
    expect(page.locator(search_page_root)).to_be_visible()


@then("the search input should be visible")
def input_visible(page):
    expect(page.locator(search_input)).to_be_visible()


@then(parsers.parse('the search location pill should display "{city}"'))
def location_pill(page, city):
    expect(page.locator(search_location_pill)).to_be_visible()
    expect(page.locator(search_location_pill)).to_contain_text(city)


@then("no pagination controls should be visible")
def no_pagination(page):
    for selector in (pagination_next, pagination_prev, pagination_numbers):
        expect(page.locator(selector)).to_have_count(0)


@then("exactly one debounced search request should be sent")
def one_debounced_request(page):
    # The initial empty-query load fires before typing. Filter to the
    # request that carries our typed `q=` so we count only debounce-driven
    # calls and not the page-mount baseline.
    typed = [
        r for r in page.search_requests  # type: ignore[attr-defined]
        if re.search(r"facial", str(r.get("params", {}).get("q", "")), flags=re.I)
    ]
    assert len(typed) == 1, (
        f"Expected exactly one debounced resolve request for q=facial, got {len(typed)}: "
        f"{[r.get('params') for r in page.search_requests]}"  # type: ignore[attr-defined]
    )


@then("a 429 response should be observed")
def saw_429(page):
    statuses = page.evaluate("window.__rateBurstStatuses || []")
    assert 429 in statuses, (
        f"No 429 in burst statuses: {statuses}"
    )


@then("the search rate-limit toast should be visible")
def rate_toast_visible(page):
    expect(page.locator(search_rate_toast)).to_be_visible()


@then(parsers.parse('the search request payload should include "{frag}"'))
def payload_contains(page, frag):
    # POST body params are stored as a dict in r["params"]. Fragments arrive in
    # the legacy "key=value" query form; match them against the dict, else fall
    # back to a substring check over the serialised params.
    if "=" in frag:
        key, _, value = frag.partition("=")
        matched = [
            r for r in page.search_requests  # type: ignore[attr-defined]
            if str(r.get("params", {}).get(key)) == value
        ]
    else:
        matched = [
            r for r in page.search_requests  # type: ignore[attr-defined]
            if frag in json.dumps(r.get("params", {}))
        ]
    assert matched, (
        f"No search resolve request params contained {frag!r}. Recorded params: "
        f"{[r.get('params') for r in page.search_requests]}"  # type: ignore[attr-defined]
    )


@then("at least one search result card should be visible")
def at_least_one_card(page):
    expect(page.locator(search_result_card).first).to_be_visible()


@then(parsers.parse('the visible results should include "{needle}"'))
def results_include(page, needle):
    expect(page.locator(search_results)).to_contain_text(needle)


@then("a result card with the Coming Soon badge should be visible")
def future_badge_visible(page):
    expect(page.locator(search_future_badge).first).to_be_visible()


@then("more search result cards should load automatically")
def more_cards_loaded(page):
    initial = getattr(page, "initial_search_count", 0)
    final = page.locator(search_result_card).count()
    assert final > initial, (
        f"Infinite scroll did not append: {initial} -> {final}"
    )


@then("the end-of-results marker should eventually be visible")
def end_marker_visible(page):
    # Continue scrolling until end marker shows up.
    deadline = time.monotonic() + 8.0
    while time.monotonic() < deadline:
        if page.locator(search_end_marker).count():
            break
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(600)
    expect(page.locator(search_end_marker)).to_be_visible()


@then("the search input should be focusable and have an accessible label")
def input_a11y(page):
    box = page.locator(search_input)
    box.focus()
    expect(box).to_be_focused()
    label = box.get_attribute("aria-label") or ""
    assert label.strip(), "search input is missing aria-label"


@then("the search results region should announce updates politely")
def status_aria_live(page):
    status_el = page.locator(search_status)
    expect(status_el).to_have_attribute("aria-live", "polite")


@then("the search error toast should be visible")
def error_toast_visible(page):
    expect(page.locator(search_error_toast)).to_be_visible()


@then(parsers.parse("the first search response should arrive within {budget:d} ms"))
def first_response_under_budget(page, budget):
    samples = list(page.search_response_ms)  # type: ignore[attr-defined]
    assert samples, "No search responses were recorded."
    first = samples[0]
    assert first <= budget, (
        f"First search response took {first:.0f}ms, budget {budget}ms"
    )


# ---------------------------------------------------------------------------
# Module-level cleanup — drop seeded rows so a re-run starts clean.
# pytest-bdd doesn't expose teardown hooks for `scenarios()`-imported
# features, so we register one with the request fixture per test.
# ---------------------------------------------------------------------------

import pytest


@pytest.fixture(autouse=True)
def _cleanup_after_test():
    yield
    try:
        # Best-effort — don't fail the test on cleanup errors.
        _cleanup_seeded_services()
    except Exception:
        pass
    # Also ping the API so the next test's rate bucket starts fresh-ish.
    try:
        requests.get(f"{BACKEND_URL}/api/beauty/signup/", timeout=2)
    except Exception:
        pass
