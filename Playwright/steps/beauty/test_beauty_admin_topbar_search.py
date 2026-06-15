"""End-to-end tests for the BeautyAdminWebTopbarComponent global search.

The topbar search appears on every post-auth admin page.  Typing a query
and pressing Enter emits a NAV BffLink that navigates to
`/admin/portal/crm?q=<encoded>`.  The CRM resolver reads `q` and filters.

Fixture strategy (mirrors test_beauty_admin_portal_tickets.py):
  * Sign up a throwaway admin (customer user + BeautyAdminPrincipal owner).
  * Sign up a throwaway search-target customer with a unique tag so the match
    is deterministic (only this test's customer matches the fragment).
  * Log admin in via REST, inject session cookie + device_id localStorage.
  * Teardown: delete both users + the principal.
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_web_topbar_page import (
    topbar_search_clear,
    topbar_search_input,
)
from Playwright.pages.pogoda.beauty.admin_portal_crm_page import (
    crm_root,
    crm_rows,
    crm_search,
    crm_result_count,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_topbar_search.feature")

_STATE: dict = {}


@pytest.fixture(scope="function", autouse=True)
def _clear_state():
    _STATE.clear()
    yield
    _STATE.clear()


def _shell(cmd: str) -> str:
    """Run a one-liner in the backend container's Django shell.

    Raises RuntimeError on non-zero exit so seeding failures surface
    immediately rather than leaving a silent empty fixture.
    """
    proc = subprocess.run(
        ["docker", "exec", "main_frame-backend-1", "python", "manage.py", "shell", "-c", cmd],
        capture_output=True,
        text=True,
        timeout=30,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"_shell() failed (rc={proc.returncode}):\n"
            f"stdout: {proc.stdout!r}\nstderr: {proc.stderr!r}"
        )
    return (proc.stdout or "").strip()


@pytest.fixture(scope="function")
def admin_with_search_customer(page):
    """Seed a throwaway admin + a uniquely-named search-target customer.

    The search customer's email uses a unique tag so `q=topbarsearch_<tag>`
    matches exactly one user regardless of any pre-existing DB state.
    """
    tag = uuid.uuid4().hex[:8]
    password = "SrchPass123!"

    admin_email = f"srch_admin_{tag}@beauty-test.com"
    # The search customer's email fragment is unique enough to match only them.
    target_email = f"topbarsearch_{tag}@beauty-test.com"
    # Use the tag as the search fragment — it appears in the email.
    search_frag = f"topbarsearch_{tag}"

    # --- Sign up admin ---
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": admin_email, "password": password},
        timeout=10,
    )
    assert resp.status_code == 201, f"Admin signup failed: {resp.text}"

    # --- Sign up search target customer ---
    resp2 = requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": target_email, "password": password},
        timeout=10,
    )
    assert resp2.status_code == 201, f"Target signup failed: {resp2.text}"

    # --- Promote admin user to BeautyAdminPrincipal owner ---
    admin_id = int(_shell(
        "from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(email='{admin_email}').id)"
    ))
    principal_id = int(_shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "p,_=BeautyAdminPrincipal.objects.update_or_create("
        f"user_type='customer', user_id={admin_id}, defaults={{'role':'owner'}}); "
        "print(p.id)"
    ))

    # --- Get target customer DB id (used to assert row presence) ---
    target_id = int(_shell(
        "from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(email='{target_email}').id)"
    ))

    # --- Log admin in, inject session cookie ---
    login = requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={"email": admin_email, "password": password, "device_id": TEST_DEVICE_ID},
        timeout=10,
    )
    assert login.status_code == 200, f"Admin login failed: {login.text}"
    cookie = login.cookies.get(BEAUTY_SESSION_COOKIE)
    assert cookie, f"Login did not set {BEAUTY_SESSION_COOKIE!r} cookie."

    page.context.add_cookies([{
        "name": BEAUTY_SESSION_COOKIE,
        "value": cookie,
        "domain": "localhost",
        "path": "/",
        "httpOnly": False,
    }])
    page.context.add_init_script(
        f"localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');"
    )

    # Record pre-search total so Scenario 3 can assert filtered < unfiltered.
    # BeautyUser is the customer model (all records are customers).
    total_customers = int(_shell(
        "from beauty_api.models import BeautyUser; "
        "print(BeautyUser.objects.count())"
    ))

    _STATE.update({
        "admin_email": admin_email,
        "target_email": target_email,
        "target_id": target_id,
        "search_frag": search_frag,
        "principal_id": principal_id,
        "total_customers": total_customers,
    })

    yield _STATE

    # --- Teardown ---
    _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')"
    )
    delete_test_users(admin_email)
    delete_test_users(target_email)


# ---------------------------------------------------------------------------
# Background
# ---------------------------------------------------------------------------

@given("I am signed in as a Beauty admin with a seeded search customer")
def signed_in_admin(page, admin_with_search_customer):
    # Cookie + localStorage already injected by the fixture.  Just record
    # state for later steps.
    _STATE.update(admin_with_search_customer)


# ---------------------------------------------------------------------------
# Navigation steps
# ---------------------------------------------------------------------------

@given("I am on the admin portal dashboard")
def open_dashboard(page):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_dashboard")
    # Wait for the admin-web chrome (topbar) to be mounted.
    expect(page.locator(topbar_search_input)).to_be_visible(timeout=20000)


# ---------------------------------------------------------------------------
# Topbar search action steps
# ---------------------------------------------------------------------------

@when("I type the customer fragment into the topbar search and press Enter")
def search_and_submit(page):
    frag = _STATE["search_frag"]
    inp = page.locator(topbar_search_input)
    inp.click()
    inp.fill(frag)
    inp.press("Enter")
    # Wait for the Angular router to navigate and the CRM shell to mount.
    expect(page.locator(crm_root)).to_be_visible(timeout=20000)
    # Wait for the loading indicator to clear (stale-while-revalidate settle).
    page.wait_for_function(
        "() => !document.querySelector('app-admin-portal-crm-list .aw-loading')",
        timeout=10000,
    )


@when("I type the customer fragment into the topbar search input")
def type_into_topbar(page):
    frag = _STATE["search_frag"]
    inp = page.locator(topbar_search_input)
    inp.click()
    inp.fill(frag)


@when("I submit an empty topbar search")
def submit_empty_search(page):
    inp = page.locator(topbar_search_input)
    inp.click()
    inp.fill("")
    inp.press("Enter")
    # Wait for the CRM to mount (may already be there if a previous step ran).
    expect(page.locator(crm_root)).to_be_visible(timeout=20000)
    page.wait_for_function(
        "() => !document.querySelector('app-admin-portal-crm-list .aw-loading')",
        timeout=10000,
    )


@when("I click the topbar search clear button")
def click_clear(page):
    page.locator(topbar_search_clear).click()


# ---------------------------------------------------------------------------
# Assertion steps — Scenario 1: navigates to filtered CRM
# ---------------------------------------------------------------------------

@then("the URL should contain the search query parameter")
def url_has_query(page):
    frag = _STATE["search_frag"]
    # The Angular router sets the URL after navigation.  Use expect with a
    # URL-match function rather than a raw string to handle encoding.
    page.wait_for_url(lambda url: "q=" in url, timeout=10000)
    import urllib.parse
    current = page.url
    parsed = urllib.parse.urlparse(current)
    params = urllib.parse.parse_qs(parsed.query)
    assert "q" in params, f"Expected 'q' param in URL, got: {current!r}"
    assert params["q"][0] == frag, (
        f"Expected q={frag!r}, got q={params['q'][0]!r} (URL: {current!r})"
    )


@then("the CRM list should show only matching rows")
def crm_shows_filtered_rows(page):
    # The result count text is "N results".  With a unique tag there should be
    # exactly 1 match.  Assert ≥1 and the row text contains the target email.
    expect(page.locator(crm_result_count)).to_be_visible(timeout=10000)
    result_text = page.locator(crm_result_count).inner_text()
    # e.g. "1 results" or "1,234 results" — extract the number
    count_str = result_text.split()[0].replace(",", "")
    assert count_str.isdigit(), f"Could not parse result count from: {result_text!r}"
    n = int(count_str)
    assert n >= 1, f"Expected ≥1 filtered results, got {n}"
    # The total unfiltered customer count should be greater than this filtered count
    # (as long as there's more than 1 customer — safe given we seeded at least 2).
    total = _STATE["total_customers"]
    if total > 1:
        assert n < total, (
            f"Filtered count ({n}) should be < total ({total}); "
            "query may not be filtering"
        )


@then("the matching customer row should be visible")
def target_row_visible(page):
    target_email = _STATE["target_email"]
    expect(page.locator(crm_rows, has_text=target_email)).to_have_count(1, timeout=10000)


# ---------------------------------------------------------------------------
# Assertion steps — Scenario 2: CRM in-page search carries the query
# ---------------------------------------------------------------------------

@then("the CRM in-page search input should be prefilled with the query")
def crm_search_prefilled(page):
    frag = _STATE["search_frag"]
    crm_inp = page.locator(crm_search)
    expect(crm_inp).to_be_visible(timeout=10000)
    expect(crm_inp).to_have_value(frag, timeout=5000)


# ---------------------------------------------------------------------------
# Assertion steps — Scenario 3: empty search opens unfiltered CRM
# ---------------------------------------------------------------------------

@then("the URL should not contain a query parameter")
def url_has_no_query(page):
    current = page.url
    import urllib.parse
    parsed = urllib.parse.urlparse(current)
    params = urllib.parse.parse_qs(parsed.query)
    assert "q" not in params or not params["q"][0], (
        f"Expected no 'q' param in URL, got: {current!r}"
    )


@then("the CRM list should show more rows than the filtered result")
def crm_shows_unfiltered(page):
    expect(page.locator(crm_result_count)).to_be_visible(timeout=10000)
    result_text = page.locator(crm_result_count).inner_text()
    count_str = result_text.split()[0].replace(",", "")
    assert count_str.isdigit(), f"Could not parse result count from: {result_text!r}"
    n = int(count_str)
    # With the unique tag fragment the filtered count was 1; unfiltered ≥2.
    assert n >= 2, (
        f"Expected unfiltered CRM to have ≥2 rows, got {n}. "
        "Empty search may still be filtering."
    )


# ---------------------------------------------------------------------------
# Assertion steps — Scenario 4: clear button
# ---------------------------------------------------------------------------

@then("the topbar search clear button should be visible")
def clear_btn_visible(page):
    expect(page.locator(topbar_search_clear)).to_be_visible(timeout=5000)


@then("the topbar search input should be empty")
def topbar_input_empty(page):
    expect(page.locator(topbar_search_input)).to_have_value("", timeout=5000)
