"""End-to-end tests for the Beauty Admin Portal — Bookings ledger (desktop).

* Renders real rows on the shared admin-web chrome.
* The status chips filter reactively (local-state + stale-while-revalidate, no
  navigation) to the real DB count.
* A row opens the desktop booking detail and "Back to bookings" returns to the
  desktop ledger — the regression that previously dropped into a phone page.

Read-only against existing seeded bookings (throwaway admin principal).
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_bookings_ledger_page import (
    bl_chips,
    bl_root,
    bl_rows,
    bl_sort,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_portal_bookings_ledger.feature")

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
def admin_on_ledger(page):
    tag = uuid.uuid4().hex[:6]
    admin_email = f"bladmin_{tag}@beauty-test.com"
    password = "BlPass123!"
    assert requests.post(f"{BACKEND_URL}/api/beauty/signup/",
                         json={"email": admin_email, "password": password}, timeout=10).status_code == 201
    admin_id = int(_shell("from beauty_api.models import BeautyUser; "
                          f"print(BeautyUser.objects.get(email='{admin_email}').id)"))
    principal_id = int(_shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "p,_=BeautyAdminPrincipal.objects.update_or_create("
        f"user_type='customer', user_id={admin_id}, defaults={{'role':'owner'}}); print(p.id)"))

    total = int(_shell("from beauty_api.models import BeautyBooking; print(BeautyBooking.objects.count())"))
    if total == 0:
        pytest.skip("No seeded bookings.")

    login = requests.post(f"{BACKEND_URL}/api/beauty/login/",
                          json={"email": admin_email, "password": password, "device_id": TEST_DEVICE_ID}, timeout=10)
    assert login.status_code == 200, f"Login failed: {login.text}"
    page.context.add_cookies([{
        "name": BEAUTY_SESSION_COOKIE, "value": login.cookies.get(BEAUTY_SESSION_COOKIE),
        "domain": "localhost", "path": "/", "httpOnly": False,
    }])
    page.add_init_script(f"window.localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');")
    _STATE.update({"admin_email": admin_email, "principal_id": principal_id})
    yield _STATE

    _shell("from beauty_api.models import BeautyAdminPrincipal; "
           f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')")
    delete_test_users(admin_email)


@given("I am signed in as a Beauty admin viewing the bookings ledger")
def open_ledger(page, admin_on_ledger):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_bookings")
    expect(page.locator(bl_root)).to_be_visible(timeout=15000)
    page.wait_for_selector(bl_rows, timeout=10000)


@then("the ledger should show booking rows")
def shows_rows(page):
    assert page.locator(bl_rows).count() > 0


@when('I click the "Cancelled" status chip')
def click_cancelled(page):
    page.locator(bl_chips, has_text="Cancelled").first.click()
    page.wait_for_timeout(1200)  # stale-while-revalidate refetch (no navigation)


@when('I click the "Pending" status chip')
def click_pending(page):
    page.locator(bl_chips, has_text="Pending").first.click()
    page.wait_for_timeout(1200)  # stale-while-revalidate refetch (no navigation)


@then("the Sort control should sit on the same row as the status chips")
def sort_inline_with_chips(page):
    chips = page.locator(bl_chips)
    first = chips.first.bounding_box()
    last = chips.last.bounding_box()
    sort_box = page.locator(bl_sort).bounding_box()
    assert first and last and sort_box
    # All status chips on a single row (no internal wrap).
    assert abs(first["y"] - last["y"]) <= 8, f"chips wrapped: first y={first['y']} last y={last['y']}"
    # Sort sits on that same row, not dropped to a line below (the regression).
    assert abs(sort_box["y"] - first["y"]) <= 8, f"Sort not inline: sort y={sort_box['y']} chips y={first['y']}"


@then("the visible rows should equal the real cancelled-booking count")
def rows_equal_cancelled(page):
    real = int(_shell(
        "from beauty_api.models import BeautyBooking; "
        "print(BeautyBooking.objects.filter(status__in=BeautyBooking.CANCELLED_STATUSES).count())"
    ))
    capped = min(real, 50)  # resolver caps the list at 50
    expect(page.locator(bl_rows)).to_have_count(capped)


@when("I click the first booking row")
def click_row(page):
    page.locator(bl_rows).first.click()


@then("the desktop booking detail should open")
def detail_opens(page):
    expect(page.locator("app-admin-portal-booking-detail .aw-shell")).to_be_visible(timeout=10000)


@when("I click Back to bookings")
def click_back(page):
    page.locator("app-admin-portal-booking-detail .aw-btn--sec").click()


@then("the desktop bookings ledger should show")
def ledger_shows_again(page):
    expect(page.locator(bl_root)).to_be_visible(timeout=10000)
    page.wait_for_selector(bl_rows, timeout=10000)
