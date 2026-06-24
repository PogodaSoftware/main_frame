"""End-to-end tests for the Beauty Admin Portal — Auth screens (desktop).

The four auth artboards are pre-auth, so the meaningful real-backend flow is
the sign-in form: filling valid credentials POSTs `/api/beauty/login/`, which
sets the `beauty_auth` session cookie and forwards the BFF to the 2FA screen.

* Sign-in    → real login, session cookie set, 2FA step renders.
* Magic link → BFF-resolved render, form-only by default (no "Link sent" card).
* IP warning → BFF-resolved render of the allowlist block.

Admin identity is the allowlist overlay: a fresh customer is signed up via
REST and promoted by inserting a `BeautyAdminPrincipal` row.
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_auth_page import (
    ip_alert,
    magic_root,
    magic_success_card,
    magic_title,
    signin_email,
    signin_password,
    signin_root,
    signin_submit,
    twofa_root,
    twofa_title,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_portal_auth.feature")


_STATE: dict = {}

_DESKTOP = {"width": 1280, "height": 900}


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


def _set_admin_principal(user_type: str, user_id: int, role: str = "owner") -> int:
    out = _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "p,_=BeautyAdminPrincipal.objects.update_or_create("
        f"  user_type='{user_type}', user_id={user_id},"
        f"  defaults={{'role': '{role}'}}); "
        "print(p.id)"
    )
    return int(out)


@pytest.fixture(scope="function")
def seeded_admin():
    """Create one customer and promote it to an admin Owner."""
    tag = uuid.uuid4().hex[:6]
    email = f"authtest_{tag}@beauty-test.com"
    password = "AuthPass123!"

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
    principal_id = _set_admin_principal("customer", user_id, role="owner")

    yield {"email": email, "password": password, "user_id": user_id,
           "principal_id": principal_id}

    _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')"
    )
    delete_test_users(email)


@pytest.fixture(scope="function")
def seeded_admin_session(page):
    """Create a customer, promote to admin Owner, log in, inject cookie."""
    tag = uuid.uuid4().hex[:6]
    email = f"magictest_{tag}@beauty-test.com"
    password = "MagicPass123!"

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
    principal_id = _set_admin_principal("customer", user_id, role="owner")

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

    _STATE.update({"email": email, "password": password,
                   "user_id": user_id, "principal_id": principal_id, "cookie": cookie})
    yield _STATE

    _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')"
    )
    delete_test_users(email)


def _open_desktop(page, route: str) -> None:
    page.set_viewport_size(_DESKTOP)
    page.add_init_script(
        f"window.localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');"
    )
    goto_route(page, route)
    page.wait_for_selector("app-beauty-shell", timeout=25000)


# ---------------------------------------------------------------------------
# Scenario 1 — sign-in advances to 2FA
# ---------------------------------------------------------------------------

@given("a seeded admin principal exists")
def given_seeded_admin(seeded_admin):
    _STATE.update(seeded_admin)


@when("I open the admin sign-in page at desktop width")
def open_signin(page):
    _open_desktop(page, "beauty_admin_portal_signin")
    expect(page.locator(signin_root)).to_be_visible(timeout=10000)


@when("I submit the admin sign-in form with the seeded credentials")
def submit_signin(page):
    page.locator(signin_email).fill(_STATE["email"])
    page.locator(signin_password).fill(_STATE["password"])
    page.locator(signin_submit).click()
    # Login POST + BFF re-resolve to the 2FA route.
    page.wait_for_url("**/admin/portal/2fa", timeout=15000)


@then("the browser should hold a beauty_auth session cookie")
def assert_session_cookie(page):
    cookies = {c["name"]: c["value"] for c in page.context.cookies()}
    assert cookies.get(BEAUTY_SESSION_COOKIE), (
        f"Expected {BEAUTY_SESSION_COOKIE!r} cookie after login; saw {list(cookies)}"
    )


@then("the two-factor step should render")
def assert_2fa(page):
    expect(page.locator(twofa_root)).to_be_visible(timeout=10000)
    expect(page.locator(twofa_title)).to_contain_text("Enter your code")


# ---------------------------------------------------------------------------
# Scenario 2 — magic-link renders form-only
# ---------------------------------------------------------------------------

@given("a seeded admin session is active")
def given_seeded_admin_session(seeded_admin_session):
    _STATE.update(seeded_admin_session)


@when("I open the admin magic-link page at desktop width")
def open_magic(page):
    page.add_init_script(
        f"window.localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');"
    )
    _open_desktop(page, "beauty_admin_portal_magic")


@then("the magic-link form should render")
def assert_magic_form(page):
    expect(page.locator(magic_root)).to_be_visible(timeout=10000)
    expect(page.locator(magic_title)).to_contain_text("Send magic link")


@then('the "Link sent" success card should not be visible')
def assert_no_success_card(page):
    expect(page.locator(magic_success_card)).to_have_count(0)


# ---------------------------------------------------------------------------
# Scenario 3 — IP-warning renders
# ---------------------------------------------------------------------------

@when("I open the admin IP-warning page at desktop width")
def open_ip(page):
    _open_desktop(page, "beauty_admin_portal_ip_warning")


@then("the IP allowlist alert should render")
def assert_ip_alert(page):
    expect(page.locator(ip_alert)).to_be_visible(timeout=10000)
