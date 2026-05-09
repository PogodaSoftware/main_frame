"""Playwright tests for the Beauty Admin CRM screen.

Setup notes
-----------
The CRM admin surface is gated by the `BEAUTY_ADMIN_PRINCIPALS` env var and
the `beauty_admin_principals` DB table on the Django backend. These tests:

1. Create a fresh customer account via the REST signup endpoint.
2. Promote that account to admin by inserting a BeautyAdminPrincipal row via
   `_set_admin_principal()`.  The DB row is read on every BFF request so no
   server restart is required.
3. Sign in via the REST login endpoint to obtain a session cookie.
4. Inject that cookie into the Playwright browser context and navigate.

The `_shell` helper runs `python manage.py shell -c <cmd>` directly
against the local Backend/controller directory — no Docker required.
"""

import os
import subprocess
import uuid
import pytest
import requests
from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import goto_route, timeout_for_testing
from Playwright.pages.pogoda.beauty.admin_crm_page import (
    crm_page_root,
    crm_shell,
    crm_sub_header,
    crm_search_input,
    crm_search_submit,
    tab_all,
    tab_customer,
    tab_business,
    page_info,
    next_btn,
    suspended_badge,
    suspend_btn,
    reinstate_btn,
)
from .beauty_utils import (
    BACKEND_URL,
    TEST_DEVICE_ID,
    BEAUTY_SESSION_COOKIE,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_crm.feature")


_MANAGE_PY_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "Backend", "controller")
)

_STATE: dict = {}


@pytest.fixture(scope="function", autouse=True)
def _clear_state():
    _STATE.clear()
    yield
    _STATE.clear()


def _shell(cmd: str) -> str:
    """Run a one-liner in the Django management shell (local, no Docker).

    Raises RuntimeError if the process exits non-zero or writes to stderr,
    so DB-seeding failures surface explicitly instead of silently.
    """
    proc = subprocess.run(
        ["docker", "exec", "main_frame-backend-1", "python", "manage.py", "shell", "-c", cmd],
        capture_output=True,
        text=True,
        timeout=30,
    )
    if proc.returncode != 0 or proc.stderr.strip():
        raise RuntimeError(
            f"_shell() failed (rc={proc.returncode}):\n"
            f"stdout: {proc.stdout!r}\nstderr: {proc.stderr!r}"
        )
    return (proc.stdout or "").strip()


def _set_admin_principal(user_type: str, user_id: int) -> None:
    """Grant admin access by inserting a BeautyAdminPrincipal DB row.

    hateoas_service._admin_principal_allowlist() reads this table on every
    request so no server restart is required.
    """
    out = _shell(
        f"from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.get_or_create("
        f"    user_type='{user_type}', user_id={user_id}); "
        f"print('ok')"
    )
    assert out == 'ok', f"_set_admin_principal failed: {out!r}"


def _clear_admin_principal(user_type: str, user_id: int) -> None:
    """Remove the BeautyAdminPrincipal DB row for the given principal."""
    out = _shell(
        f"from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.filter("
        f"    user_type='{user_type}', user_id={user_id}).delete(); "
        f"print('ok')"
    )
    assert out == 'ok', f"_clear_admin_principal failed: {out!r}"


@pytest.fixture(scope="function")
def beauty_admin():
    """Create a customer, mark them admin, return credentials."""
    email = f"crmadmin_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "AdminPass123!"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": email, "password": password},
        timeout=10,
    )
    assert resp.status_code == 201, f"Admin signup failed: {resp.text}"
    user_id_raw = _shell(
        f"from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(email='{email}').id)"
    )
    user_id = int(user_id_raw)
    _set_admin_principal("customer", user_id)
    yield {"email": email, "password": password, "user_id": user_id}
    _clear_admin_principal("customer", user_id)
    delete_test_users(email)


def _seed_accounts(unique_tag: str) -> None:
    """Seed 3 customers + 3 businesses with recognisable emails."""
    cmd = (
        "from beauty_api.models import BeautyUser, BusinessProvider; "
        "from django.contrib.auth.hashers import make_password; "
        f"tag = '{unique_tag}'; "
        "[(BeautyUser.objects.get_or_create("
        "    email=f'crmtest_cust_{tag}_{i}@beauty-test.com',"
        "    defaults={'password': make_password('!')})) for i in range(1, 4)]; "
        "[(BusinessProvider.objects.get_or_create("
        "    email=f'crmtest_biz_{tag}_{i}@beauty-test.com',"
        "    defaults={'password': make_password('!'),"
        "              'business_name': f'Studio_{tag}_{i}'})) for i in range(1, 4)]; "
        "print('seeded')"
    )
    out = _shell(cmd)
    assert "seeded" in out, f"Seed failed: {out!r}"


def _seed_target_customer(tag: str, email: str, password: str) -> int:
    """Create (or reset) a plain customer whose ID we need for suspend tests."""
    cmd = (
        "from beauty_api.models import BeautyUser; "
        "from django.contrib.auth.hashers import make_password; "
        f"u, _ = BeautyUser.objects.get_or_create("
        f"    email='{email}', defaults={{'password': make_password('{password}')}}); "
        f"u.set_password('{password}'); u.save(update_fields=['password']); "
        "print(u.id)"
    )
    return int(_shell(cmd))


def _cleanup_seeded(tag: str) -> None:
    _shell(
        "from beauty_api.models import BeautyUser, BusinessProvider; "
        f"BeautyUser.objects.filter(email__contains='crmtest_').delete(); "
        f"BusinessProvider.objects.filter(email__contains='crmtest_').delete(); "
        "print('cleaned')"
    )


@pytest.fixture(scope="function")
def seeded(beauty_admin):
    tag = uuid.uuid4().hex[:6]
    _seed_accounts(tag)
    target_email = f"crmtest_login_{tag}@beauty-test.com"
    target_password = "SeedPass123!"
    target_id = _seed_target_customer(tag, target_email, target_password)
    yield {
        "tag": tag,
        "admin": beauty_admin,
        "target_email": target_email,
        "target_password": target_password,
        "target_id": target_id,
    }
    _cleanup_seeded(tag)


def _login_admin(page, admin: dict) -> None:
    """Sign in the admin via REST and attach the session cookie.

    The Angular app reads `beauty_device_id` from localStorage and sends it as
    the X-Device-ID header on every BFF call.  The backend cookie embeds the
    same device_id and validates the two match.  We therefore pre-seed
    localStorage with TEST_DEVICE_ID *before* navigating so Angular picks up
    the same value that was used during REST login.
    """
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={
            "email": admin["email"],
            "password": admin["password"],
            "device_id": TEST_DEVICE_ID,
        },
        timeout=10,
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    cookie = resp.cookies.get(BEAUTY_SESSION_COOKIE)
    assert cookie, f"Login did not set {BEAUTY_SESSION_COOKIE!r} cookie."
    page.context.add_cookies([{
        "name": BEAUTY_SESSION_COOKIE,
        "value": cookie,
        "domain": "localhost",
        "path": "/",
        "httpOnly": False,
    }])
    # Pre-seed localStorage so Angular reads the same device_id that is encoded
    # in the signed session cookie above.  add_init_script runs before any page
    # script on every subsequent navigation in this context.
    page.context.add_init_script(
        f"localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');"
    )


# ---------------------------------------------------------------------------
# Step definitions
# ---------------------------------------------------------------------------

@given("I am signed in as a beauty admin with seeded accounts")
def signed_in(page, seeded):
    _login_admin(page, seeded["admin"])
    _STATE.update(seeded)


@when("I open the admin CRM page")
def open_crm(page):
    goto_route(page, "beauty_admin_crm")
    # Angular dev server may take up to 20 s to bootstrap on first load.
    # Wait for app-root to have rendered content before asserting specifics.
    page.wait_for_selector("app-beauty-shell, [data-testid]", timeout=25000)
    expect(page.locator(crm_page_root)).to_be_visible(timeout=10000)


@then("the CRM directory should render")
def directory_renders(page):
    expect(page.locator("css=.crm-list")).to_be_visible()


@then("the page should show both customer and business rows")
def both_types_render(page):
    types = [t.upper() for t in page.locator("css=.crm-type").all_inner_texts()]
    assert "CUSTOMER" in types and "BUSINESS" in types, f"Types saw: {types}"


@then("the page should use the beauty-app shell")
def uses_app_shell(page):
    expect(page.locator(crm_shell)).to_be_visible()


@then("the page should have a sub-header with the CRM title")
def has_sub_header(page):
    expect(page.locator(crm_sub_header)).to_be_visible()
    expect(page.locator("css=.prov-sub-header .title")).to_contain_text("CRM")


@then("the page should have filter tabs")
def has_filter_tabs(page):
    expect(page.locator(tab_all)).to_be_visible()
    expect(page.locator(tab_customer)).to_be_visible()
    expect(page.locator(tab_business)).to_be_visible()


@when("I click the customers tab")
def click_customer_tab(page):
    page.locator(tab_customer).click()
    page.wait_for_timeout(800)


@then("every visible row should be a customer")
def all_customer(page):
    types = page.locator("css=.crm-type").all_inner_texts()
    assert types, "No rows visible"
    assert all(t.upper() == "CUSTOMER" for t in types), f"Types: {types}"


@when("I click the businesses tab")
def click_business_tab(page):
    page.locator(tab_business).click()
    page.wait_for_timeout(800)


@then("every visible row should be a business")
def all_business(page):
    types = page.locator("css=.crm-type").all_inner_texts()
    assert types, "No rows visible"
    assert all(t.upper() == "BUSINESS" for t in types), f"Types: {types}"


@when("I search for the unique business")
def search_unique(page):
    tag = _STATE["tag"]
    page.locator(crm_search_input).fill(f"Studio_{tag}_1")
    page.locator(crm_search_submit).click()
    page.wait_for_timeout(800)


@then("only the matching account should be listed")
def only_match(page):
    names = page.locator("css=.crm-name").all_inner_texts()
    assert len(names) == 1, f"Expected 1 row, got {names}"
    assert _STATE["tag"] in names[0], f"Unexpected row: {names[0]}"


@then("the pagination control should report multiple pages")
def multi_pages(page):
    expect(page.locator(page_info)).to_contain_text("Page 1 of")


@when("I click the next page button")
def click_next(page):
    page.locator(next_btn).click()
    page.wait_for_timeout(800)


@then("the page number should advance to two")
def page_two(page):
    expect(page.locator(page_info)).to_contain_text("Page 2 of")


@when("I suspend the seeded login customer")
def suspend_target(page):
    target_id = _STATE["target_id"]
    page.locator(suspend_btn("customer", target_id)).click()
    page.wait_for_timeout(1200)


@then("the suspended badge should be visible")
def badge_visible(page):
    expect(page.locator(suspended_badge).first).to_be_visible()


@then("the seeded customer should not be able to log in")
def login_blocked(page):
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={
            "email": _STATE["target_email"],
            "password": _STATE["target_password"],
            "device_id": "blocked-device",
        },
        timeout=10,
    )
    assert resp.status_code == 403, (
        f"Suspended account login should be 403, got {resp.status_code}: {resp.text}"
    )


@when("I reinstate the seeded login customer")
def reinstate_target(page):
    target_id = _STATE["target_id"]
    page.locator(reinstate_btn("customer", target_id)).click()
    page.wait_for_timeout(1200)


@then("the seeded customer should be able to log in")
def login_works(page):
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={
            "email": _STATE["target_email"],
            "password": _STATE["target_password"],
            "device_id": "after-reinstate-device",
        },
        timeout=10,
    )
    assert resp.status_code == 200, (
        f"Reinstated account should log in, got {resp.status_code}: {resp.text}"
    )
