"""End-to-end tests for the Beauty Admin Portal — Booking detail (desktop).

Regression cover for the bug where opening a booking from a customer dropped
into the old phone-frame layout. Now it renders on the shared admin-web chrome.

Read-only against an existing seeded booking (the throwaway admin principal can
view any booking; nothing is mutated).
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_booking_detail_page import (
    bd_conf,
    bd_customer_party,
    bd_parties,
    bd_root,
    bd_status,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_portal_booking_detail.feature")

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
def admin_on_booking(page):
    tag = uuid.uuid4().hex[:6]
    admin_email = f"bkadmin_{tag}@beauty-test.com"
    password = "BkPass123!"

    assert requests.post(f"{BACKEND_URL}/api/beauty/signup/",
                         json={"email": admin_email, "password": password}, timeout=10).status_code == 201
    admin_id = int(_shell("from beauty_api.models import BeautyUser; "
                          f"print(BeautyUser.objects.get(email='{admin_email}').id)"))
    principal_id = int(_shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "p,_=BeautyAdminPrincipal.objects.update_or_create("
        f"user_type='customer', user_id={admin_id}, defaults={{'role':'owner'}}); print(p.id)"))

    booking_id = _shell("from beauty_api.models import BeautyBooking; "
                        "b=BeautyBooking.objects.order_by('id').first(); print(b.id if b else 0)")
    if booking_id in ("", "0"):
        pytest.skip("No seeded bookings to drill into.")

    login = requests.post(f"{BACKEND_URL}/api/beauty/login/",
                          json={"email": admin_email, "password": password, "device_id": TEST_DEVICE_ID}, timeout=10)
    assert login.status_code == 200, f"Login failed: {login.text}"
    page.context.add_cookies([{
        "name": BEAUTY_SESSION_COOKIE, "value": login.cookies.get(BEAUTY_SESSION_COOKIE),
        "domain": "localhost", "path": "/", "httpOnly": False,
    }])
    page.add_init_script(f"window.localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');")
    _STATE.update({"admin_email": admin_email, "principal_id": principal_id, "booking_id": int(booking_id)})
    yield _STATE

    _shell("from beauty_api.models import BeautyAdminPrincipal; "
           f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')")
    delete_test_users(admin_email)


@given("I am signed in as a Beauty admin opening a real booking")
def open_booking(page, admin_on_booking):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_booking_detail", id=_STATE["booking_id"])
    expect(page.locator(bd_root)).to_be_visible(timeout=15000)


@then("the booking confirmation and status should show")
def conf_and_status(page):
    expect(page.locator(bd_conf)).to_be_visible()
    assert (page.locator(bd_conf).inner_text() or "").startswith("BK-")
    expect(page.locator(bd_status).first).to_be_visible()


@then("both the customer and provider parties should show")
def parties_show(page):
    expect(page.locator(bd_parties)).to_have_count(2)


@when("I click the customer party")
def click_customer(page):
    party = page.locator(bd_customer_party).first
    expect(party).to_be_enabled()
    party.click()


@then("the admin customer detail should open")
def customer_detail_opens(page):
    page.wait_for_url("**/admin/portal/crm/customer/**", timeout=10000)
    expect(page.locator("app-admin-portal-customer-detail .aw-shell")).to_be_visible(timeout=10000)
