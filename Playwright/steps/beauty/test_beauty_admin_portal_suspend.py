"""End-to-end tests for the Beauty Admin Portal — Suspend confirm modal (desktop).

* Focus-trap   → the dialog opens with focus on the reason field.
* Required reason → clearing it and confirming shows a validation error and does
                  NOT call the BFF (the account stays active in the DB).
* Reasoned suspend → confirming with a reason POSTs the suspend, flips
                  is_suspended, invalidates the account's active sessions, and
                  writes an `account.suspend` audit event.

Each scenario gets a fresh throwaway target customer (with a live session) so
the suspend has something real to act on.
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_suspend_page import (
    sus_confirm,
    sus_dialog,
    sus_error,
    sus_reason,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_portal_suspend.feature")

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


def _is_suspended(uid: int) -> bool:
    return _shell(
        "from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(id={uid}).is_suspended)"
    ) == "True"


@pytest.fixture(scope="function")
def admin_on_suspend(page):
    tag = uuid.uuid4().hex[:6]
    admin_email = f"susadmin_{tag}@beauty-test.com"
    target_email = f"sustarget_{tag}@beauty-test.com"
    password = "SusPass123!"

    # Admin principal.
    assert requests.post(f"{BACKEND_URL}/api/beauty/signup/",
                         json={"email": admin_email, "password": password}, timeout=10).status_code == 201
    admin_id = int(_shell("from beauty_api.models import BeautyUser; "
                          f"print(BeautyUser.objects.get(email='{admin_email}').id)"))
    principal_id = int(_shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "p,_=BeautyAdminPrincipal.objects.update_or_create("
        f"user_type='customer', user_id={admin_id}, defaults={{'role':'owner'}}); print(p.id)"))

    # Target customer + a live session (so we can prove suspension kills it).
    assert requests.post(f"{BACKEND_URL}/api/beauty/signup/",
                         json={"email": target_email, "password": password}, timeout=10).status_code == 201
    target_id = int(_shell("from beauty_api.models import BeautyUser; "
                           f"print(BeautyUser.objects.get(email='{target_email}').id)"))
    tlogin = requests.post(f"{BACKEND_URL}/api/beauty/login/",
                           json={"email": target_email, "password": password, "device_id": "victim-device"}, timeout=10)
    assert tlogin.status_code == 200

    # Admin session → injected into the browser.
    login = requests.post(f"{BACKEND_URL}/api/beauty/login/",
                          json={"email": admin_email, "password": password, "device_id": TEST_DEVICE_ID}, timeout=10)
    assert login.status_code == 200, f"Login failed: {login.text}"
    page.context.add_cookies([{
        "name": BEAUTY_SESSION_COOKIE, "value": login.cookies.get(BEAUTY_SESSION_COOKIE),
        "domain": "localhost", "path": "/", "httpOnly": False,
    }])
    page.add_init_script(f"window.localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');")
    _STATE.update({"admin_email": admin_email, "target_email": target_email,
                   "principal_id": principal_id, "target_id": target_id})
    yield _STATE

    _shell("from beauty_api.models import BeautyAdminPrincipal; "
           f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')")
    _shell("from beauty_api.models import BeautyAdminAuditEvent; "
           f"BeautyAdminAuditEvent.objects.filter(target_id='{target_id}').delete(); print('ok')")
    delete_test_users(admin_email)
    delete_test_users(target_email)


@given("I am signed in as a Beauty admin viewing the suspend confirm for a test customer")
def open_suspend(page, admin_on_suspend):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_suspend", type="customer", id=_STATE["target_id"])
    expect(page.locator(sus_dialog)).to_be_visible(timeout=15000)
    page.wait_for_timeout(400)  # let ngAfterViewInit move focus to the textarea


@then("the reason field should hold focus")
def reason_focused(page):
    focused = page.evaluate("() => document.activeElement && document.activeElement.classList.contains('aw-reason')")
    assert focused, "Expected the reason textarea to hold focus on open (focus-trap)."


@when("I clear the reason and click Yes, suspend")
def clear_and_confirm(page):
    page.locator(sus_reason).fill("")
    page.locator(sus_confirm).click()


@then("a required-reason validation error should show")
def validation_error(page):
    expect(page.locator(sus_error)).to_be_visible()


@then("the customer should not be suspended in the database")
def not_suspended(page):
    page.wait_for_timeout(500)
    assert not _is_suspended(_STATE["target_id"]), "Account was suspended despite an empty reason."
    assert "/admin/portal/crm/suspend/" in page.url, "Should still be on the suspend route (no BFF call)."


@when("I click Yes, suspend with the default reason")
def confirm_with_reason(page):
    # Resolver pre-fills a default reason; ensure it's non-empty, then confirm.
    val = page.locator(sus_reason).input_value()
    if not val.strip():
        page.locator(sus_reason).fill("Repeat chargeback flags — pending T&S review.")
    page.locator(sus_confirm).click()


@then("the customer should be suspended in the database")
def suspended(page):
    page.wait_for_url("**/admin/portal/crm**", timeout=10000)
    for _ in range(20):
        if _is_suspended(_STATE["target_id"]):
            return
        page.wait_for_timeout(250)
    raise AssertionError("Customer was not suspended.")


@then("the customer's active sessions should be invalidated")
def sessions_killed(page):
    active = int(_shell(
        "from beauty_api.models import BeautySession; "
        f"print(BeautySession.objects.filter(user_id={_STATE['target_id']}, user_type='customer', is_active=True).count())"
    ))
    assert active == 0, f"Expected 0 active sessions after suspend, found {active}."


@then('an "account.suspend" audit event should be recorded')
def audit_recorded(page):
    n = int(_shell(
        "from beauty_api.models import BeautyAdminAuditEvent; "
        f"print(BeautyAdminAuditEvent.objects.filter(action='account.suspend', target_id='{_STATE['target_id']}').count())"
    ))
    assert n >= 1, "Expected an account.suspend audit event."
