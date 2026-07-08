"""End-to-end tests for the Beauty Admin Portal — CRM list (desktop).

* Status filter   → "Suspended" narrows rows to the real suspended count (DB).
* Live search     → typing a known email prefix (no Enter) narrows in place.
* Bulk Suspend    → routes to the audited suspend-confirm modal (no silent
                    batch), matching RN + the destructive-action contract.

The list is reactive (local-state + stale-while-revalidate), so the tests wait
briefly for the debounce/refetch rather than a navigation.
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_crm_page import (
    bulk_suspend,
    crm_rows,
    crm_root,
    crm_search,
    crm_tabs,
    hactions_add_tag,
    manage_tags_btn,
    row_checkbox,
    status_chips,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_portal_crm.feature")

_STATE: dict = {}


@pytest.fixture(scope="function", autouse=True)
def _clear_state():
    _STATE.clear()
    yield
    _STATE.clear()


def _shell(cmd: str) -> str:
    proc = subprocess.run(
        ["docker", "exec", "main_frame-backend-1", "python", "manage.py", "shell", "-c", cmd],
        capture_output=True, text=True, timeout=30,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"_shell() failed (rc={proc.returncode}): {proc.stderr!r}")
    return (proc.stdout or "").strip()


@pytest.fixture(scope="function")
def admin_on_crm(page):
    tag = uuid.uuid4().hex[:6]
    email = f"crmtest_{tag}@beauty-test.com"
    password = "CrmPass123!"
    resp = requests.post(f"{BACKEND_URL}/api/beauty/signup/",
                         json={"email": email, "password": password}, timeout=10)
    assert resp.status_code == 201, f"Signup failed: {resp.text}"

    user_id = int(_shell(
        "from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(email='{email}').id)"
    ))
    principal_id = int(_shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "p,_=BeautyAdminPrincipal.objects.update_or_create("
        f"user_type='customer', user_id={user_id}, defaults={{'role':'owner'}}); print(p.id)"
    ))
    login = requests.post(f"{BACKEND_URL}/api/beauty/login/",
                          json={"email": email, "password": password, "device_id": TEST_DEVICE_ID}, timeout=10)
    assert login.status_code == 200, f"Login failed: {login.text}"
    cookie = login.cookies.get(BEAUTY_SESSION_COOKIE)
    page.context.add_cookies([{
        "name": BEAUTY_SESSION_COOKIE, "value": cookie,
        "domain": "localhost", "path": "/", "httpOnly": False,
    }])
    page.add_init_script(f"window.localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');")
    _STATE.update({"email": email, "user_id": user_id, "principal_id": principal_id, "prefix": f"crmtest_{tag}"})
    yield _STATE

    _shell("from beauty_api.models import BeautyAdminPrincipal; "
           f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')")
    delete_test_users(email)


@given("I am signed in as a Beauty admin viewing the CRM list")
def open_crm(page, admin_on_crm):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_crm")
    expect(page.locator(crm_root)).to_be_visible(timeout=15000)
    page.wait_for_selector(crm_rows, timeout=10000)


@when('I click the "Suspended" status chip')
def click_suspended(page):
    page.locator(status_chips, has_text="Suspended").first.click()
    page.wait_for_timeout(1200)  # debounce + stale-while-revalidate refetch


@then("the visible rows should equal the real suspended-customer count")
def rows_equal_suspended(page):
    real = int(_shell(
        "from beauty_api.models import BeautyUser; "
        "print(BeautyUser.objects.filter(is_suspended=True).count())"
    ))
    expect(page.locator(crm_rows)).to_have_count(real)
    _STATE["suspended_count"] = real


@then('every visible row should show the "SUSPENDED" status')
def rows_all_suspended(page):
    rows = page.locator(crm_rows)
    for i in range(rows.count()):
        assert "SUSPENDED" in (rows.nth(i).locator(".c-status").inner_text() or "").upper()


@when("I type a seeded customer's email prefix into the search box")
def type_search(page):
    page.locator(crm_search).fill(_STATE["prefix"])
    page.wait_for_timeout(1200)


@then("the list should narrow to that one account")
def list_narrowed(page):
    rows = page.locator(crm_rows)
    expect(rows).to_have_count(1)
    expect(rows.first).to_contain_text(_STATE["email"])


@when("I select the first account and click bulk Suspend")
def select_and_bulk_suspend(page):
    page.locator(f"{crm_rows} {row_checkbox}").first.check()
    page.locator(bulk_suspend).click()


@then("the suspend-confirm screen for that account should open")
def suspend_confirm_opens(page):
    page.wait_for_url("**/admin/portal/crm/suspend/**", timeout=10000)
    assert "/admin/portal/crm/suspend/" in page.url


@then('there should be no "Add tag" button in the header actions area')
def no_add_tag_button(page):
    # Scope to .aw-hactions; match exact text "Add tag" so "Manage tags" is not caught.
    buttons = page.locator(hactions_add_tag)
    add_tag_count = 0
    for i in range(buttons.count()):
        if buttons.nth(i).inner_text().strip() == "Add tag":
            add_tag_count += 1
    assert add_tag_count == 0, (
        f"Expected 0 buttons with exact text 'Add tag' in .aw-hactions, found {add_tag_count}"
    )


@when('I click the "Manage tags" header button')
def click_manage_tags(page):
    page.locator(manage_tags_btn, has_text="Manage tags").click()


@then("I should land on the tag manager page")
def on_tag_manager_page(page):
    page.wait_for_url("**/admin/portal/crm/tags**", timeout=10000)
    assert "/admin/portal/crm/tags" in page.url


@when("I switch to the Business providers tab")
def switch_to_providers_tab(page):
    page.locator(crm_tabs, has_text="Business providers").click()
    # Stale-while-revalidate refetch for the providers type
    page.wait_for_timeout(1200)
