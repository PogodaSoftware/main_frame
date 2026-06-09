"""End-to-end tests for the Beauty Admin Portal — Team page.

Verifies that every interactive element on `/admin/portal/team` drives a
real backend write:

* Invite composer  → creates a `BeautyAdminInvite` row + `team.invite` audit event.
* Kebab role save  → updates `BeautyAdminPrincipal.role` + `team.role` audit event.
* Kebab revoke     → deletes the principal row + `team.revoke` audit event.

The fixtures here mirror the pattern used by the old admin-CRM test (now
deleted): a fresh customer is signed up via REST, promoted to admin by
inserting a `BeautyAdminPrincipal` row, signed in via REST to obtain a
session cookie, and that cookie is injected into the Playwright browser
context before navigating.
"""

import os
import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_team_page import (
    admin_kebab,
    admin_menu_revoke,
    admin_menu_role_select,
    admin_menu_save,
    admin_rows,
    invite_email_input,
    invite_role_chip,
    invite_rows,
    invite_send_button,
    team_header_title,
    team_page_root,
    team_summary,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_portal_team.feature")


_STATE: dict = {}


@pytest.fixture(scope="function", autouse=True)
def _clear_state():
    _STATE.clear()
    yield
    _STATE.clear()


def _shell(cmd: str) -> str:
    """Run a one-liner inside the backend container's Django shell.

    Raises RuntimeError on non-zero exit so seeding failures surface
    explicitly rather than silently leaving an empty fixture.
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


def _set_admin_principal(user_type: str, user_id: int, role: str = "owner") -> int:
    """Insert (or update) a BeautyAdminPrincipal row and return its PK."""
    out = _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "p,_=BeautyAdminPrincipal.objects.update_or_create("
        f"  user_type='{user_type}', user_id={user_id},"
        f"  defaults={{'role': '{role}'}}); "
        "print(p.id)"
    )
    return int(out)


def _clear_admin_principal(user_type: str, user_id: int) -> None:
    _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.filter(user_type='{user_type}', user_id={user_id}).delete(); "
        "print('ok')"
    )


def _cleanup_seeded_admins(tag: str) -> None:
    _shell(
        "from beauty_api.models import BeautyUser, BeautyAdminPrincipal, BeautyAdminInvite, BeautyAdminAuditEvent; "
        f"users=list(BeautyUser.objects.filter(email__contains='teamtest_{tag}_')); "
        "BeautyAdminPrincipal.objects.filter(user_id__in=[u.id for u in users]).delete(); "
        f"BeautyAdminInvite.objects.filter(email__contains='teamtest_{tag}_').delete(); "
        f"BeautyAdminInvite.objects.filter(email__contains='new_invite').delete(); "
        f"BeautyAdminAuditEvent.objects.filter(actor_email__contains='teamtest_{tag}_').delete(); "
        "BeautyUser.objects.filter(id__in=[u.id for u in users]).delete(); "
        "print('cleaned')"
    )


def _login_admin(page, admin: dict) -> None:
    """Sign in the admin via REST and attach the session cookie."""
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
def beauty_owner_with_team():
    """Create one Owner + one Support lead + one Support agent admin."""
    tag = uuid.uuid4().hex[:6]
    password = "TeamPass123!"

    owner_email = f"teamtest_{tag}_owner@beauty-test.com"
    lead_email = f"teamtest_{tag}_lead@beauty-test.com"
    agent_email = f"teamtest_{tag}_agent@beauty-test.com"

    for email in (owner_email, lead_email, agent_email):
        resp = requests.post(
            f"{BACKEND_URL}/api/beauty/signup/",
            json={"email": email, "password": password},
            timeout=10,
        )
        assert resp.status_code == 201, f"Signup failed: {email}: {resp.text}"

    out = _shell(
        "from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(email='{owner_email}').id, "
        f"      BeautyUser.objects.get(email='{lead_email}').id, "
        f"      BeautyUser.objects.get(email='{agent_email}').id)"
    )
    owner_id, lead_id, agent_id = (int(s) for s in out.split())

    _set_admin_principal("customer", owner_id, role="owner")
    lead_principal_id = _set_admin_principal("customer", lead_id, role="support_lead")
    agent_principal_id = _set_admin_principal("customer", agent_id, role="support_agent")

    yield {
        "tag": tag,
        "owner": {"email": owner_email, "password": password, "user_id": owner_id},
        "lead": {"email": lead_email, "user_id": lead_id, "principal_id": lead_principal_id},
        "agent": {"email": agent_email, "user_id": agent_id, "principal_id": agent_principal_id},
    }

    _cleanup_seeded_admins(tag)
    for email in (owner_email, lead_email, agent_email):
        delete_test_users(email)


# ---------------------------------------------------------------------------
# Step definitions
# ---------------------------------------------------------------------------

@given("I am signed in as a Beauty Owner with seeded admin roster")
def signed_in(page, beauty_owner_with_team):
    _login_admin(page, beauty_owner_with_team["owner"])
    _STATE.update(beauty_owner_with_team)


@when("I open the admin portal team page")
def open_team_page(page):
    goto_route(page, "beauty_admin_portal_team")
    page.wait_for_selector("app-beauty-shell, [data-testid]", timeout=25000)
    expect(page.locator(team_page_root)).to_be_visible(timeout=10000)


@then("the team page should render")
def team_renders(page):
    expect(page.locator(team_header_title)).to_contain_text("Admin team")


@then("the roster should list every seeded admin")
def roster_lists_seeded(page):
    page.wait_for_selector(admin_rows, timeout=5000)
    emails = page.locator(f"{admin_rows} .row-text .r-email").all_inner_texts()
    tag = _STATE["tag"]
    seeded = {_STATE["owner"]["email"], _STATE["lead"]["email"], _STATE["agent"]["email"]}
    missing = [e for e in seeded if e not in emails]
    assert not missing, f"Missing admins in roster: {missing} (saw {emails})"


@then("the page header should show the real admin and owner counts")
def header_counts(page):
    real = _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "n=BeautyAdminPrincipal.objects.count(); "
        "o=BeautyAdminPrincipal.objects.filter(role='owner').count(); "
        "print(n, o)"
    )
    n_admins, n_owners = (int(s) for s in real.split())
    expect(page.locator(team_summary)).to_contain_text(f"{n_admins} admins")
    expect(page.locator(team_summary)).to_contain_text(f"{n_owners} owner")


@when('I fill the invite composer with "new_invite@beauty-test.com" as "Support agent"')
def fill_invite(page):
    page.locator(invite_email_input).fill("new_invite@beauty-test.com")
    page.locator(invite_role_chip, has_text="Support agent").click()


@when('I click "Send invite"')
def click_send_invite(page):
    page.locator(invite_send_button).click()
    page.wait_for_timeout(1200)


@then('a BeautyAdminInvite row should exist for "new_invite@beauty-test.com"')
def invite_row_in_db(page):
    out = _shell(
        "from beauty_api.models import BeautyAdminInvite; "
        "print(BeautyAdminInvite.objects.filter("
        "  email='new_invite@beauty-test.com', consumed_at__isnull=True).count())"
    )
    assert int(out) >= 1, f"Expected at least 1 pending invite, got {out}"


@then('a "team.invite" audit event should be logged for that email')
def invite_audit_logged(page):
    out = _shell(
        "from beauty_api.models import BeautyAdminAuditEvent; "
        "print(BeautyAdminAuditEvent.objects.filter("
        "  action='team.invite', target_label='new_invite@beauty-test.com').count())"
    )
    assert int(out) >= 1, f"Expected team.invite audit event, got {out}"


@then('the page should list "new_invite@beauty-test.com" under pending invites')
def invite_visible_in_ui(page):
    # Re-resolve the page so the new invite renders.
    goto_route(page, "beauty_admin_portal_team")
    page.wait_for_selector(invite_rows, timeout=5000)
    emails = page.locator(f"{invite_rows} .row-text .r-name").all_inner_texts()
    assert "new_invite@beauty-test.com" in emails, f"Saw invites: {emails}"


def _kebab_for_email(page, email: str):
    """Click the kebab for the row whose email matches."""
    page.wait_for_selector(admin_rows, timeout=5000)
    rows = page.locator(admin_rows)
    for i in range(rows.count()):
        row = rows.nth(i)
        text = row.text_content() or ""
        if email in text:
            row.locator(admin_kebab).click()
            return
    raise AssertionError(f"No row found for email {email!r}")


@when("I open the kebab menu for the support-lead admin")
def open_kebab_lead(page):
    _kebab_for_email(page, _STATE["lead"]["email"])


@when('I pick "Risk analyst" and click Save')
def pick_risk_save(page):
    page.locator(admin_menu_role_select).select_option(value="risk_analyst")
    page.locator(admin_menu_save).click()
    page.wait_for_timeout(1200)


@then('the principal\'s role in the DB should be "risk_analyst"')
def role_updated_in_db(page):
    principal_id = _STATE["lead"]["principal_id"]
    out = _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"print(BeautyAdminPrincipal.objects.get(id={principal_id}).role)"
    )
    assert out == "risk_analyst", f"Role not updated: got {out!r}"


@then('a "team.role" audit event should be logged for the principal')
def role_audit_logged(page):
    principal_id = _STATE["lead"]["principal_id"]
    out = _shell(
        "from beauty_api.models import BeautyAdminAuditEvent; "
        "print(BeautyAdminAuditEvent.objects.filter("
        f"  action='team.role', target_id='{principal_id}').count())"
    )
    assert int(out) >= 1, f"Expected team.role audit event, got {out}"


@when("I open the kebab menu for the support-agent admin")
def open_kebab_agent(page):
    _kebab_for_email(page, _STATE["agent"]["email"])


@when('I click "Revoke admin"')
def click_revoke(page):
    # window.confirm blocks; auto-accept it.
    page.once("dialog", lambda d: d.accept())
    page.locator(admin_menu_revoke).click()
    page.wait_for_timeout(1500)


@then("the principal should be removed from the DB")
def principal_removed(page):
    principal_id = _STATE["agent"]["principal_id"]
    out = _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"print(BeautyAdminPrincipal.objects.filter(id={principal_id}).count())"
    )
    assert out == "0", f"Principal still exists: {out!r}"


@then('a "team.revoke" audit event should be logged')
def revoke_audit_logged(page):
    principal_id = _STATE["agent"]["principal_id"]
    out = _shell(
        "from beauty_api.models import BeautyAdminAuditEvent; "
        "print(BeautyAdminAuditEvent.objects.filter("
        f"  action='team.revoke', target_id='{principal_id}').count())"
    )
    assert int(out) >= 1, f"Expected team.revoke audit event, got {out}"
