"""End-to-end tests for the Beauty Admin Portal — Dashboard (desktop).

* Renders real KPI counts    → Customers tile == live BeautyUser count (DB).
* Range filter               → ?range=30d re-resolves; trend label is server-
                                driven ("Last 30 days · daily signups").
* Notification bell          → the self-fetched dropdown mirrors the
                                `beauty_admin_portal_notifications` BFF feed
                                (same item count + unread badge).

Admin identity = the allowlist overlay: a fresh customer is signed up via REST
and promoted with a `BeautyAdminPrincipal` row; the session cookie is injected
into the browser context (the dashboard resolver gates on `is_beauty_admin`,
not on 2FA completion).
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_dashboard_page import (
    bell_badge,
    bell_button,
    dash_root,
    dash_sidebar,
    dash_title,
    kpi_tiles,
    notif_items,
    range_button,
    trend_sub,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_portal_dashboard.feature")


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
def admin_session(page):
    """Create a customer, promote to admin Owner, sign in, inject the cookie."""
    tag = uuid.uuid4().hex[:6]
    email = f"dashtest_{tag}@beauty-test.com"
    password = "DashPass123!"

    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": email, "password": password}, timeout=10,
    )
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

    login = requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={"email": email, "password": password, "device_id": TEST_DEVICE_ID},
        timeout=10,
    )
    assert login.status_code == 200, f"Login failed: {login.text}"
    cookie = login.cookies.get(BEAUTY_SESSION_COOKIE)
    assert cookie, "Login missing beauty_auth cookie."

    page.context.add_cookies([{
        "name": BEAUTY_SESSION_COOKIE, "value": cookie,
        "domain": "localhost", "path": "/", "httpOnly": False,
    }])
    page.add_init_script(
        f"window.localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');"
    )

    _STATE.update({"email": email, "password": password,
                   "user_id": user_id, "principal_id": principal_id, "cookie": cookie})
    yield _STATE

    _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')"
    )
    delete_test_users(email)


def _bff_notifications() -> dict:
    """Fetch the admin notifications envelope the same way the topbar does."""
    resp = requests.post(
        f"{BACKEND_URL}/api/bff/beauty/resolve/",
        json={"screen": "beauty_admin_portal_notifications", "device_id": TEST_DEVICE_ID},
        cookies={BEAUTY_SESSION_COOKIE: _STATE["cookie"]},
        timeout=10,
    )
    assert resp.status_code == 200, f"Notifications resolve failed: {resp.text}"
    return (resp.json().get("data") or {})


# ---------------------------------------------------------------------------

@given("I am signed in as a Beauty admin viewing the dashboard")
def open_dashboard(page, admin_session):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_dashboard")
    expect(page.locator(dash_root)).to_be_visible(timeout=15000)


@then("the dashboard chrome should render")
def chrome_renders(page):
    expect(page.locator(dash_sidebar)).to_be_visible()
    expect(page.locator(dash_title)).to_contain_text("Today on Beauty")


@then("the Customers KPI should equal the real customer count")
def kpi_matches_db(page):
    real = int(_shell(
        "from beauty_api.models import BeautyUser; print(BeautyUser.objects.count())"
    ))
    expected = f"{real:,}"
    tiles = page.locator(kpi_tiles)
    found = None
    for i in range(tiles.count()):
        tile = tiles.nth(i)
        if "customers" in (tile.locator(".aw-kpi-lbl").inner_text() or "").lower():
            found = tile.locator(".aw-kpi-val").inner_text().strip()
            break
    assert found == expected, f"Customers KPI {found!r} != real count {expected!r}"


@when('I switch the dashboard range to "Last 30 days"')
def switch_range(page):
    # Drive the real query-param re-resolve via the chart's 30D chip.
    page.locator("app-admin-portal-dashboard .aw-chips button", has_text="30D").click()
    page.wait_for_url("**/admin/portal/dashboard?range=30d", timeout=10000)
    expect(page.locator(dash_root)).to_be_visible(timeout=10000)


@then('the trend sub-label should read "Last 30 days · daily signups"')
def trend_label(page):
    expect(page.locator(trend_sub)).to_contain_text("Last 30 days · daily signups")


@then('the range button should read "Last 30 days"')
def range_button_label(page):
    expect(page.locator(range_button)).to_contain_text("Last 30 days")


@when("I open the notification bell")
def open_bell(page):
    page.locator(bell_button).click()
    page.wait_for_timeout(500)


@then("the dropdown should list the same number of items as the BFF feed")
def dropdown_matches_feed(page):
    feed = _bff_notifications()
    _STATE["_feed"] = feed
    expected = len(feed.get("notifications") or [])
    expect(page.locator(notif_items)).to_have_count(expected)


@then("the bell badge should match the BFF unread count")
def badge_matches_unread(page):
    unread = int((_STATE.get("_feed") or _bff_notifications()).get("unread") or 0)
    if unread:
        expect(page.locator(bell_badge)).to_have_text(str(unread))
    else:
        expect(page.locator(bell_badge)).to_have_count(0)
