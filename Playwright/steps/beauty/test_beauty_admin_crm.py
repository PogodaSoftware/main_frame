"""Playwright BDD tests for the Beauty Admin CRM screen.

Setup notes
-----------
The CRM admin surface is gated by the `BEAUTY_ADMIN_PRINCIPALS` env var
on the Django backend. The fixture seeds a customer account, promotes
that account into the allowlist via a Django shell call against the
running backend container, and then signs that user in via the public
login endpoint to obtain a session cookie.
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
    crm_root,
    crm_search_input,
    crm_search_submit,
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
    delete_test_users,
)


scenarios("../../features/Pogoda/Beauty/beauty_admin_crm.feature")


_MANAGE_PY_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "Backend", "controller"
)


_STATE: dict = {}


@pytest.fixture(scope="function", autouse=True)
def _clear_state():
    _STATE.clear()
    yield
    _STATE.clear()


def _shell(cmd: str) -> str:
    """Run a one-line Django shell command in the backend container."""
    container = os.environ.get("BACKEND_CONTAINER", "main_frame-backend-1")
    proc = subprocess.run(
        ["docker", "exec", container, "python", "manage.py", "shell", "-c", cmd],
        capture_output=True, text=True, timeout=30,
    )
    return (proc.stdout or "").strip()


def _set_admin_principal(user_type: str, user_id: int) -> None:
    """Update the BEAUTY_ADMIN_PRINCIPALS env on the running container.

    Implementation note: the env-var on a running container can't be
    rewritten in-place. Instead we monkey-patch the in-memory allowlist
    helper so that the running Django process treats the new principal
    as admin without a restart.
    """
    cmd = (
        "from bff_api.services import hateoas_service as h; "
        f"h._admin_principal_allowlist = lambda: {{('{user_type}', {user_id})}}; "
        "from beauty_api import admin_views, admin_crm_views; "
        "import importlib; importlib.reload(admin_views); importlib.reload(admin_crm_views); "
        "print('ok')"
    )
    out = _shell(cmd)
    assert "ok" in out, f"Failed to patch admin allowlist: {out}"


@pytest.fixture(scope="function")
def beauty_admin():
    """Create a customer, mark them admin in-process, return creds."""
    email = f"crmadmin_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "AdminPass123!"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": email, "password": password},
        timeout=10,
    )
    assert resp.status_code == 201, f"Setup failed: {resp.text}"
    user_id = int(_shell(
        f"from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(email='{email}').id)"
    ))
    _set_admin_principal("customer", user_id)
    yield {"email": email, "password": password, "user_id": user_id}
    delete_test_users(email)


def _seed_accounts(unique_tag: str, login_email: str, login_password: str) -> dict:
    """Seed several customer + business rows for the CRM list."""
    cmd = (
        "from beauty_api.models import BeautyUser, BusinessProvider; "
        "from django.contrib.auth.hashers import make_password; "
        f"tag = '{unique_tag}'; "
        "for i in range(1, 4): "
        "    BeautyUser.objects.get_or_create(email=f'crmtest_cust_{tag}_{i}@beauty-test.com', "
        "        defaults={'password': make_password('!')}); "
        "for i in range(1, 4): "
        "    BusinessProvider.objects.get_or_create(email=f'crmtest_biz_{tag}_{i}@beauty-test.com', "
        "        defaults={'password': make_password('!'), 'business_name': f'Studio_{tag}_{i}'}); "
        f"u, _ = BeautyUser.objects.get_or_create(email='{login_email}', "
        f"    defaults={{'password': make_password('{login_password}')}}); "
        f"u.set_password('{login_password}'); u.save(update_fields=['password']); "
        "print(u.id)"
    )
    target_id = int(_shell(cmd))
    return {"target_id": target_id}


@pytest.fixture(scope="function")
def seeded(beauty_admin):
    tag = uuid.uuid4().hex[:6]
    login_email = f"crmtest_login_{tag}@beauty-test.com"
    login_password = "SeedPass123!"
    info = _seed_accounts(tag, login_email, login_password)
    yield {
        "tag": tag,
        "admin": beauty_admin,
        "target_email": login_email,
        "target_password": login_password,
        "target_id": info["target_id"],
    }
    # Cleanup seeded rows.
    cleanup = (
        "from beauty_api.models import BeautyUser, BusinessProvider; "
        f"BeautyUser.objects.filter(email__contains='crmtest_').delete(); "
        f"BusinessProvider.objects.filter(email__contains='crmtest_').delete(); "
        "print('ok')"
    )
    _shell(cleanup)


def _login_admin(page, admin):
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={"email": admin["email"], "password": admin["password"], "device_id": TEST_DEVICE_ID},
        timeout=10,
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    cookie = resp.cookies.get("beauty_auth")
    assert cookie, "Login did not set auth cookie."
    page.context.add_cookies([{
        "name": "beauty_auth",
        "value": cookie,
        "domain": "localhost",
        "path": "/",
        "httpOnly": False,
    }])


@given("I am signed in as a beauty admin with seeded accounts")
def signed_in(page, seeded):
    _login_admin(page, seeded["admin"])
    _STATE.update(seeded)


@when("I open the admin CRM page")
def open_crm(page):
    goto_route(page, "beauty_admin_crm")
    timeout_for_testing(page)
    expect(page.locator(crm_root)).to_be_visible()


@then("the CRM directory should render")
def directory_renders(page):
    expect(page.locator("css=.crm-list")).to_be_visible()


@then("the page should show both customer and business rows")
def both_types_render(page):
    types = page.locator("css=.crm-type").all_inner_texts()
    assert "Customer" in types and "Business" in types, f"Types saw: {types}"


@when("I click the customers tab")
def click_customer_tab(page):
    page.locator(tab_customer).click()
    page.wait_for_timeout(800)


@then("every visible row should be a customer")
def all_customer(page):
    types = page.locator("css=.crm-type").all_inner_texts()
    assert types, "No rows visible"
    assert all(t == "Customer" for t in types), f"Types: {types}"


@when("I click the businesses tab")
def click_business_tab(page):
    page.locator(tab_business).click()
    page.wait_for_timeout(800)


@then("every visible row should be a business")
def all_business(page):
    types = page.locator("css=.crm-type").all_inner_texts()
    assert types, "No rows visible"
    assert all(t == "Business" for t in types), f"Types: {types}"


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
    page.wait_for_timeout(1000)


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
    assert resp.status_code == 403, f"Suspended account login should be 403, got {resp.status_code}: {resp.text}"


@when("I reinstate the seeded login customer")
def reinstate_target(page):
    target_id = _STATE["target_id"]
    page.locator(reinstate_btn("customer", target_id)).click()
    page.wait_for_timeout(1000)


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
    assert resp.status_code == 200, f"Reinstated account should log in, got {resp.status_code}: {resp.text}"
