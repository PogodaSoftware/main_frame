"""End-to-end tests for the Beauty Admin Portal — Feature Flags (desktop).

* Renders the shared admin-web chrome (sidebar, topbar, session-bar, page header)
  with real flags from the BFF resolver.
* Toggling a flag POSTs the toggle link, refetches in place, and writes an audit row.
* The two deleted screens (beauty_admin_portal_dashboard_v2, beauty_admin_crm)
  are rejected by the BFF with 400.

Seeds a throwaway admin principal (customer user) and cleans up in teardown.
Never mutates shared seed data; never changes permanent flag state (restores after toggle).
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_flags_page import (
    flags_audit_rows,
    flags_audit_table,
    flags_card,
    flags_header_title,
    flags_root,
    flags_rows,
    flags_toggle,
    flags_status_pill,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_portal_flags.feature")

_STATE: dict = {}


@pytest.fixture(scope="function", autouse=True)
def _clear_state():
    _STATE.clear()
    yield
    _STATE.clear()


def _shell(cmd: str) -> str:
    """Run a one-liner inside the backend container's Django shell."""
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


def _login_admin(page, email: str, password: str) -> None:
    """Sign in via REST and attach the session cookie + device_id to the Playwright context."""
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={"email": email, "password": password, "device_id": TEST_DEVICE_ID},
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
def admin_on_flags(page):
    """
    Creates a throwaway admin principal, logs in, navigates to /admin/flags.
    Teardown deletes the principal and user.
    """
    tag = uuid.uuid4().hex[:6]
    admin_email = f"flagsadmin_{tag}@beauty-test.com"
    password = "FlagsAdm123!"

    # 1. Create the admin user + principal
    assert requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": admin_email, "password": password},
        timeout=10,
    ).status_code == 201, "Admin signup failed"

    admin_id = int(_shell(
        "from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(email='{admin_email}').id)"
    ))
    principal_id = int(_shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"p,_=BeautyAdminPrincipal.objects.update_or_create(user_type='customer', user_id={admin_id}, defaults={{'role': 'owner'}}); print(p.id)"
    ))

    _login_admin(page, admin_email, password)

    _STATE.update({
        "tag": tag,
        "admin_email": admin_email,
        "admin_id": admin_id,
        "principal_id": principal_id,
    })
    yield _STATE

    # Teardown — restore any toggled flag state, delete principal + user
    # Re-enable BEAUTY_BUSINESS_LOGIN_ENABLED if it was disabled by a test
    try:
        if _STATE.get("toggled_key") and _STATE.get("toggled_original") is not None:
            _shell(
                "from beauty_api.models import BeautyFeatureFlag; "
                f"BeautyFeatureFlag.objects.filter(key='{_STATE['toggled_key']}')"
                f".update(enabled={_STATE['toggled_original']}); print('restored')"
            )
    except Exception:
        pass
    # Clean up the test's own audit rows
    try:
        _shell(
            "from beauty_api.models import BeautyFlagAudit; "
            f"BeautyFlagAudit.objects.filter(changed_by_email='{admin_email}').delete(); "
            "print('cleaned flag audit')"
        )
    except Exception:
        pass
    _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); "
        "print('cleaned principal')"
    )
    delete_test_users(admin_email)


# ---------------------------------------------------------------------------
# Background step
# ---------------------------------------------------------------------------

@given("I am signed in as a Beauty admin viewing the feature flags page")
def open_flags(page, admin_on_flags):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_flags")
    expect(page.locator(flags_root)).to_be_visible(timeout=15000)


# ---------------------------------------------------------------------------
# Scenario: page renders on the shared desktop chrome with real flags
# ---------------------------------------------------------------------------

@then("the flags page should display the desktop admin chrome")
def has_desktop_chrome(page):
    # Shared chrome: sidebar present
    expect(page.locator("app-admin-web-sidebar")).to_be_visible(timeout=8000)
    # Page header title
    expect(page.locator(flags_header_title)).to_be_visible(timeout=5000)
    expect(page.locator(flags_header_title)).to_have_text("Feature flags")
    # Flags card present
    expect(page.locator(flags_card)).to_be_visible(timeout=5000)


@then("the flags page should show at least one flag row")
def has_flag_rows(page):
    rows = page.locator(flags_rows)
    expect(rows.first).to_be_visible(timeout=8000)
    count = rows.count()
    assert count >= 1, f"Expected at least 1 flag row, got {count}"


# ---------------------------------------------------------------------------
# Scenario: sidebar active item
# ---------------------------------------------------------------------------

@then("the sidebar Feature flags item should be active")
def sidebar_active(page):
    # The sidebar item gets .is-active when active="flags" matches the item id
    active_item = page.locator("app-admin-web-sidebar .aws-item.is-active")
    expect(active_item).to_be_visible(timeout=5000)
    expect(active_item).to_contain_text("Feature flags")


# ---------------------------------------------------------------------------
# Scenario: toggling a flag flips state + writes audit row
# ---------------------------------------------------------------------------

@when("I toggle the first feature flag")
def toggle_first_flag(page):
    rows = page.locator(flags_rows)
    expect(rows.first).to_be_visible(timeout=8000)
    first_row = rows.first

    # Record the current key name for teardown
    key_el = first_row.locator(".aw-flag-key")
    _STATE["toggled_key"] = key_el.inner_text().strip()

    # Record the original state
    pill = first_row.locator(flags_status_pill)
    original_text = pill.inner_text().strip()
    _STATE["toggled_original_text"] = original_text
    _STATE["toggled_original"] = original_text == "On"

    # Click the toggle
    toggle_btn = first_row.locator(flags_toggle)
    toggle_btn.click()

    # Wait for the refetch — pill text must change
    page.wait_for_timeout(3000)


@then("the first flag state should be flipped")
def flag_state_flipped(page):
    rows = page.locator(flags_rows)
    first_row = rows.first
    pill = first_row.locator(flags_status_pill)
    expect(pill).to_be_visible(timeout=8000)
    new_text = pill.inner_text().strip()
    original_text = _STATE.get("toggled_original_text", "On")
    assert new_text != original_text, (
        f"Flag state did not flip: expected not '{original_text}', got '{new_text}'"
    )


@then("the audit table should show a change row for that flag")
def audit_row_present(page):
    table = page.locator(flags_audit_table)
    expect(table).to_be_visible(timeout=5000)
    audit_rows_loc = page.locator(flags_audit_rows)
    expect(audit_rows_loc.first).to_be_visible(timeout=8000)
    # At least one audit row must contain the toggled key
    toggled_key = _STATE.get("toggled_key", "")
    matching = page.locator(f"{flags_audit_rows}:has-text('{toggled_key}')")
    expect(matching.first).to_be_visible(timeout=5000)


# ---------------------------------------------------------------------------
# Scenario: deleted screens no longer resolve
# ---------------------------------------------------------------------------

@then("the BFF should reject beauty_admin_portal_dashboard_v2")
def bff_rejects_dashboard_v2(page):
    result = page.evaluate("""async () => {
        const r = await fetch('/api/bff/beauty/resolve/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                version: '2.0.0',
                screen: 'beauty_admin_portal_dashboard_v2',
                device_id: 'test-device-playwright-beauty-001',
                params: {}
            }),
        });
        return { status: r.status };
    }""")
    assert result["status"] == 400, (
        f"Expected 400 for deleted screen, got {result['status']}"
    )


@then("the BFF should reject beauty_admin_crm")
def bff_rejects_admin_crm(page):
    result = page.evaluate("""async () => {
        const r = await fetch('/api/bff/beauty/resolve/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                version: '2.0.0',
                screen: 'beauty_admin_crm',
                device_id: 'test-device-playwright-beauty-001',
                params: {}
            }),
        });
        return { status: r.status };
    }""")
    assert result["status"] == 400, (
        f"Expected 400 for deleted screen, got {result['status']}"
    )
