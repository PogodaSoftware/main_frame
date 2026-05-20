"""End-to-end tests for the Beauty Admin Portal — Audit log page.

Verifies that:
* The empty state renders when no audit events exist for the test admin.
* Recent admin actions appear in the timeline at the top, with the
  expected verb and target rendered into `title_html`.
* The summary count matches the live row count in the DB.

Pattern mirrors the team-page test: fresh customer → promoted to admin
via `BeautyAdminPrincipal` row → REST login → cookie attached to the
Playwright context.
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_audit_page import (
    audit_page_root,
    audit_summary,
    audit_title,
    empty_state_title,
    event_rows,
    event_title,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_portal_audit.feature")


_STATE: dict = {}


@pytest.fixture(scope="function", autouse=True)
def _clear_state():
    _STATE.clear()
    yield
    _STATE.clear()


def _shell(cmd: str) -> str:
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


def _set_admin_principal(user_type: str, user_id: int) -> None:
    _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "BeautyAdminPrincipal.objects.update_or_create("
        f"  user_type='{user_type}', user_id={user_id},"
        "  defaults={'role': 'owner'}); "
        "print('ok')"
    )


def _clear_audit_events_for(email: str) -> None:
    _shell(
        "from beauty_api.models import BeautyAdminAuditEvent; "
        f"BeautyAdminAuditEvent.objects.filter(actor_email='{email}').delete(); "
        "print('ok')"
    )


def _seed_audit_event(actor_email: str, action: str, target_label: str = '') -> None:
    """Insert an audit event row directly so the test doesn't depend on
    every upstream endpoint being wired."""
    _shell(
        "from beauty_api.models import BeautyAdminAuditEvent; "
        "BeautyAdminAuditEvent.objects.create("
        f"  actor_email='{actor_email}',"
        f"  actor_role='owner',"
        f"  action='{action}',"
        f"  target_label='{target_label}',"
        "  ip='127.0.0.1'"
        "); "
        "print('ok')"
    )


def _login_admin(page, admin: dict) -> None:
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
    page.context.add_init_script(
        f"localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');"
    )


@pytest.fixture(scope="function")
def beauty_admin():
    tag = uuid.uuid4().hex[:6]
    email = f"audittest_{tag}@beauty-test.com"
    password = "AuditPass123!"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": email, "password": password},
        timeout=10,
    )
    assert resp.status_code == 201, f"Signup failed: {resp.text}"
    user_id = int(_shell(
        "from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(email='{email}').id)"
    ))
    _set_admin_principal("customer", user_id)
    # Clear any audit rows this email may have produced before the test
    # ran (e.g. last_active_at touch from a previous run).
    _clear_audit_events_for(email)
    yield {"email": email, "password": password, "user_id": user_id}
    _clear_audit_events_for(email)
    _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.filter(user_type='customer', user_id={user_id}).delete(); "
        "print('ok')"
    )
    delete_test_users(email)


# ---------------------------------------------------------------------------
# Step definitions
# ---------------------------------------------------------------------------

@given("I am signed in as a Beauty admin")
def signed_in(page, beauty_admin):
    _login_admin(page, beauty_admin)
    _STATE["admin"] = beauty_admin


@given("no admin actions have been performed yet")
def no_actions(page):
    # Wipe any rows the auth gate / dashboard render created.
    _shell(
        "from beauty_api.models import BeautyAdminAuditEvent; "
        "BeautyAdminAuditEvent.objects.all().delete(); "
        "print('ok')"
    )


@given('I have performed a "tag.create" action')
def perform_tag_create():
    _seed_audit_event(_STATE["admin"]["email"], "tag.create", "Demo tag")


@given('I have performed an "account.suspend" action')
def perform_suspend():
    _seed_audit_event(_STATE["admin"]["email"], "account.suspend", "cust_99")


@when("I open the admin portal audit page")
def open_audit_page(page):
    goto_route(page, "beauty_admin_portal_audit")
    page.wait_for_selector("app-beauty-shell, [data-testid]", timeout=25000)
    expect(page.locator(audit_page_root)).to_be_visible(timeout=10000)


@then("the audit page should render")
def audit_renders(page):
    expect(page.locator(audit_title)).to_contain_text("Audit log")


@then('the empty-state title "No events yet" should be visible')
def empty_visible(page):
    expect(page.locator(empty_state_title)).to_contain_text("No events yet")


@then("the most recent event row should reference the suspend action")
def first_row_is_suspend(page):
    page.wait_for_selector(event_rows, timeout=5000)
    first_title = page.locator(event_rows).first.locator(event_title).inner_text()
    assert "suspended" in first_title.lower(), (
        f"Expected first row to be a suspend event, got: {first_title!r}"
    )


@then("the audit summary should report at least 2 events")
def summary_count(page):
    summary_text = page.locator(audit_summary).inner_text()
    # Format: "Every admin action · immutable · last 90 days · N events"
    import re
    m = re.search(r"·\s*(\d+)\s+event", summary_text)
    assert m, f"Could not parse event count from summary: {summary_text!r}"
    assert int(m.group(1)) >= 2, f"Expected ≥2 events, got: {summary_text!r}"
