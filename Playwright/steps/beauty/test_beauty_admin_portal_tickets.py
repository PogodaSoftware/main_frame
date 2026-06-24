"""End-to-end tests for the Beauty Admin Portal — Support tickets (desktop).

* Renders real ticket rows on the shared admin-web chrome.
* The composer creates a real BeautyAdminTicket row (POST 201) that appears in
  place via stale-while-revalidate (no navigation).
* The inline drawer assigns an unassigned ticket to the admin (real POST) and
  the row updates in place.

Seeds its own throwaway tickets (unique-tagged subjects) + a throwaway admin
principal, and cleans both up in teardown — never mutates shared seed data.
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_tickets_page import (
    tk_composer,
    tk_composer_body,
    tk_composer_create,
    tk_composer_subject,
    tk_drawer,
    tk_drawer_status,
    tk_new_btn,
    tk_root,
    tk_rows,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_portal_tickets.feature")

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
def admin_on_tickets(page):
    tag = uuid.uuid4().hex[:6]
    admin_email = f"tkadmin_{tag}@beauty-test.com"
    password = "TkPass123!"
    assert requests.post(f"{BACKEND_URL}/api/beauty/signup/",
                         json={"email": admin_email, "password": password}, timeout=10).status_code == 201
    admin_id = int(_shell("from beauty_api.models import BeautyUser; "
                          f"print(BeautyUser.objects.get(email='{admin_email}').id)"))
    principal_id = int(_shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "p,_=BeautyAdminPrincipal.objects.update_or_create("
        f"user_type='customer', user_id={admin_id}, defaults={{'role':'owner'}}); print(p.id)"))

    # Seed one unassigned 'new' ticket tagged for this run.
    seed_subject = f"E2E seed {tag}"
    seed_id = int(_shell(
        "from beauty_api.models import BeautyAdminTicket as T; "
        f"print(T.objects.create(priority='high', category='refund', status='new', "
        f"source='in_app', subject='{seed_subject}').id)"))

    login = requests.post(f"{BACKEND_URL}/api/beauty/login/",
                          json={"email": admin_email, "password": password, "device_id": TEST_DEVICE_ID}, timeout=10)
    assert login.status_code == 200, f"Login failed: {login.text}"
    page.context.add_cookies([{
        "name": BEAUTY_SESSION_COOKIE, "value": login.cookies.get(BEAUTY_SESSION_COOKIE),
        "domain": "localhost", "path": "/", "httpOnly": False,
    }])
    page.add_init_script(f"window.localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');")
    _STATE.update({"admin_email": admin_email, "principal_id": principal_id,
                   "tag": tag, "seed_subject": seed_subject, "seed_id": seed_id})
    yield _STATE

    # Drop every ticket tagged for this run (seed + created) and the principal/user.
    _shell("from beauty_api.models import BeautyAdminTicket as T; "
           f"T.objects.filter(subject__contains='{tag}').delete(); print('ok')")
    _shell("from beauty_api.models import BeautyAdminPrincipal; "
           f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')")
    delete_test_users(admin_email)


@given("I am signed in as a Beauty admin viewing the support tickets")
def open_tickets(page, admin_on_tickets):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_tickets")
    expect(page.locator(tk_root)).to_be_visible(timeout=15000)
    page.wait_for_selector(tk_rows, timeout=10000)


@then("the tickets table should show the seeded ticket")
def shows_seed(page):
    expect(page.locator(tk_rows, has_text=_STATE["seed_subject"])).to_have_count(1)


@when("I create a ticket through the composer")
def create_ticket(page):
    before = int(_shell("from beauty_api.models import BeautyAdminTicket as T; print(T.objects.count())"))
    _STATE["count_before"] = before
    _STATE["created_subject"] = f"E2E created {_STATE['tag']}"
    page.locator(tk_new_btn).click()
    expect(page.locator(tk_composer)).to_be_visible(timeout=5000)
    page.locator(tk_composer_subject).fill(_STATE["created_subject"])
    page.locator(tk_composer_body).fill("created by e2e composer test")
    page.locator(tk_composer_create).click()
    page.wait_for_timeout(1400)  # POST + in-place refetch


@then("the new ticket appears in the queue and the database count grows by one")
def created_appears(page):
    expect(page.locator(tk_rows, has_text=_STATE["created_subject"])).to_have_count(1)
    after = int(_shell("from beauty_api.models import BeautyAdminTicket as T; print(T.objects.count())"))
    assert after == _STATE["count_before"] + 1, f"{after} != {_STATE['count_before']} + 1"


@when("I expand the unassigned seeded ticket and assign it to me")
def assign_to_me(page):
    row = page.locator(tk_rows, has_text=_STATE["seed_subject"]).first
    row.click()
    expect(page.locator(tk_drawer)).to_be_visible(timeout=5000)
    page.get_by_role("button", name="Assign to me").click()
    page.wait_for_timeout(1400)  # POST + in-place refetch


@then("the seeded ticket row shows my admin email")
def row_shows_admin(page):
    row = page.locator(tk_rows, has_text=_STATE["seed_subject"]).first
    expect(row).to_contain_text(_STATE["admin_email"], timeout=10000)
