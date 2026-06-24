"""End-to-end tests for the Beauty Admin Portal — Audit log (desktop).

* Renders real audit-event rows on the shared admin-web chrome.
* Action chip filters drive an in-place stale-while-revalidate refetch
  (no router navigation) — the visible row count equals the DB filtered count.
* Actor search (debounced 250 ms) narrows every visible row to the typed
  actor email.
* Reason column renders the seeded `meta.reason` text.

Seeds its own throwaway `BeautyAdminAuditEvent` rows (unique-tagged actor
email) + a throwaway admin principal, and cleans both up in teardown —
never mutates shared seed data.
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_audit_page import (
    audit_actor_input,
    audit_cell_reason,
    audit_cell_who,
    audit_chips,
    audit_root,
    audit_rows,
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
def admin_on_audit(page):
    """
    Creates a throwaway owner admin, seeds 5 BeautyAdminAuditEvent rows
    (3 x account.suspend + 2 x ticket.status), all with a unique actor_email
    (`auditseed_<tag>@beauty-test.com`).  One suspend row carries
    meta={'reason': 'E2E seeded reason <tag>'}.

    Yields _STATE so step definitions can read tag / actor_email / reason.

    Teardown deletes: seeded audit rows, the admin principal, and the user.
    """
    tag = uuid.uuid4().hex[:6]
    admin_email = f"auditadmin_{tag}@beauty-test.com"
    password = "AuditAdm123!"
    seed_actor = f"auditseed_{tag}@beauty-test.com"
    seed_reason = f"E2E seeded reason {tag}"

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
        "p,_=BeautyAdminPrincipal.objects.update_or_create("
        f"  user_type='customer', user_id={admin_id},"
        "  defaults={'role': 'owner'}); print(p.id)"
    ))

    # 2. Seed 3 x account.suspend rows (one with reason, two without)
    _shell(
        "from beauty_api.models import BeautyAdminAuditEvent as E; "
        f"E.objects.create(action='account.suspend', actor_email='{seed_actor}', "
        f"  actor_role='owner', target_label='cust_001', ip='10.0.0.1', "
        f"  meta={{'reason': '{seed_reason}'}}); "
        f"E.objects.create(action='account.suspend', actor_email='{seed_actor}', "
        f"  actor_role='owner', target_label='cust_002', ip='10.0.0.1', meta={{}}); "
        f"E.objects.create(action='account.suspend', actor_email='{seed_actor}', "
        f"  actor_role='owner', target_label='cust_003', ip='10.0.0.1', meta={{}}); "
        "print('suspend seeded')"
    )

    # 3. Seed 2 x ticket.status rows
    _shell(
        "from beauty_api.models import BeautyAdminAuditEvent as E; "
        f"E.objects.create(action='ticket.status', actor_email='{seed_actor}', "
        f"  actor_role='owner', target_label='TK-001', ip='10.0.0.1', meta={{}}); "
        f"E.objects.create(action='ticket.status', actor_email='{seed_actor}', "
        f"  actor_role='owner', target_label='TK-002', ip='10.0.0.1', meta={{}}); "
        "print('ticket seeded')"
    )

    # 4. Login
    _login_admin(page, admin_email, password)

    _STATE.update({
        "tag": tag,
        "admin_email": admin_email,
        "principal_id": principal_id,
        "admin_id": admin_id,
        "seed_actor": seed_actor,
        "seed_reason": seed_reason,
    })
    yield _STATE

    # Teardown — delete seeded audit rows, principal, user
    _shell(
        "from beauty_api.models import BeautyAdminAuditEvent as E; "
        f"E.objects.filter(actor_email__contains='auditseed_{tag}').delete(); "
        "print('cleaned audit')"
    )
    _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); "
        "print('cleaned principal')"
    )
    delete_test_users(admin_email)


# ---------------------------------------------------------------------------
# Background step
# ---------------------------------------------------------------------------

@given("I am signed in as a Beauty admin viewing the audit log")
def open_audit(page, admin_on_audit):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_audit")
    expect(page.locator(audit_root)).to_be_visible(timeout=15000)
    page.wait_for_selector(audit_rows, timeout=10000)


# ---------------------------------------------------------------------------
# Scenario: table renders seeded rows
# ---------------------------------------------------------------------------

@then("the audit table should show the seeded actor rows")
def shows_seeded_rows(page):
    # At least one visible row should contain the seeded actor email
    seed_actor = _STATE["seed_actor"]
    expect(
        page.locator(f"{audit_rows}", has_text=seed_actor)
    ).to_have_count(
        5,  # 3 suspend + 2 ticket.status
        timeout=10000,
    )


# ---------------------------------------------------------------------------
# Scenario: action chip narrows the table
# ---------------------------------------------------------------------------

@when("I click the account.suspend action chip")
def click_suspend_chip(page):
    # Find the chip whose text is exactly "account.suspend"
    chip = page.locator(audit_chips, has_text="account.suspend")
    expect(chip).to_be_visible(timeout=8000)
    chip.click()
    # Stale-while-revalidate refetch — wait for the opacity fade to settle
    page.wait_for_timeout(1000)


@then("the visible row count matches the database count for account.suspend")
def chip_count_matches_db(page):
    # Query the DB for the filtered count (same filter logic as the resolver)
    db_count = int(_shell(
        "from beauty_api.models import BeautyAdminAuditEvent as E; "
        "print(E.objects.filter(action__icontains='account.suspend').count())"
    ))
    # Cap at page size 50 (same as resolver _PAGE_SIZE)
    expected = min(db_count, 50)
    visible = page.locator(audit_rows).count()
    assert visible == expected, (
        f"Expected {expected} row(s) for account.suspend (DB={db_count}), got {visible}"
    )


# ---------------------------------------------------------------------------
# Scenario: actor search narrows the table
# ---------------------------------------------------------------------------

@when("I type the seeded actor email into the actor search")
def type_actor_search(page):
    seed_actor = _STATE["seed_actor"]
    page.locator(audit_actor_input).fill(seed_actor)
    # Debounce is ~250ms; allow up to 1200ms for refetch + re-render
    page.wait_for_timeout(1200)


@then("every visible row shows the seeded actor email")
def every_row_has_actor(page):
    seed_actor = _STATE["seed_actor"]
    rows = page.locator(audit_rows)
    count = rows.count()
    assert count > 0, "No rows visible after actor search"
    for i in range(count):
        cell_text = rows.nth(i).locator(audit_cell_who).inner_text()
        assert seed_actor in cell_text, (
            f"Row {i} who-cell {cell_text!r} does not contain {seed_actor!r}"
        )


@then("the visible row count matches the seeded actor count")
def actor_row_count(page):
    seed_actor = _STATE["seed_actor"]
    db_count = int(_shell(
        "from beauty_api.models import BeautyAdminAuditEvent as E; "
        f"print(E.objects.filter(actor_email__icontains='{seed_actor}').count())"
    ))
    expected = min(db_count, 50)
    visible = page.locator(audit_rows).count()
    assert visible == expected, (
        f"Expected {expected} row(s) for actor '{seed_actor}' (DB={db_count}), got {visible}"
    )


# ---------------------------------------------------------------------------
# Scenario: reason column renders the seeded reason text
# ---------------------------------------------------------------------------

@then("a row in the reason column shows the seeded reason text")
def reason_column_shows_seeded(page):
    seed_reason = _STATE["seed_reason"]
    # At least one reason cell should contain the seeded reason string
    reason_cells = page.locator(f"{audit_rows} {audit_cell_reason}")
    count = reason_cells.count()
    assert count > 0, "No rows visible when checking reason column"
    found = False
    for i in range(count):
        text = reason_cells.nth(i).inner_text()
        if seed_reason in text:
            found = True
            break
    assert found, (
        f"No reason cell contained {seed_reason!r}. "
        f"Reason cells seen: {[reason_cells.nth(i).inner_text() for i in range(count)]}"
    )
