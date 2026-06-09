"""Steps for the Beauty Customer Favorites feature.

Validates F1-F6: per-service heart toggle on the provider page,
persistence across reloads, the Saved Services list reachable from the
Profile menu, and API-level guarantees (business 403, idempotent
POST/DELETE).

The customer is signed up via the API, then navigated through real
browser flows. The business path is API-only via the existing
`login_business_via_api` helper.
"""

from __future__ import annotations

import re
import subprocess

import requests
from playwright.sync_api import expect
from pytest_bdd import scenarios, given, when, then, parsers

from Playwright.pages.pogoda.beauty.provider_detail_page import (
    service_favorite_btn,
)
from Playwright.pages.pogoda.beauty.favorites_page import (
    favorites_card,
    favorites_business,
    favorites_empty,
    favorites_root,
)
from Playwright.pages.pogoda.beauty.profile_page import (
    saved_services_link,
)

from .beauty_utils import (
    BACKEND_URL,
    TEST_DEVICE_ID,
    delete_test_users,
    login_business_via_api,
)

import pytest

scenarios("../../features/Beauty/beauty_favorites.feature")


GLOW_PROVIDER_NAME = 'Glow Facial Studio'
SIGNATURE_FACIAL = 'Signature Facial'


# ---------------------------------------------------------------------------
# Shell helpers (mirroring test_beauty_reviews.py)
# ---------------------------------------------------------------------------

def _shell(cmd: str, *, timeout: int = 30) -> str:
    proc = subprocess.run(
        ["docker", "exec", "main_frame-backend-1",
         "python", "manage.py", "shell", "-c", cmd],
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return (proc.stdout or '') + (proc.stderr or '')


def _get_provider_id(name: str) -> int:
    out = _shell(
        "from beauty_api.models import BeautyProvider; "
        f"print(BeautyProvider.objects.filter(name='{name}').order_by('id').first().id)"
    )
    for line in out.splitlines():
        line = line.strip()
        if line.isdigit():
            return int(line)
    raise AssertionError(f"Could not resolve provider id for {name}: {out}")


def _get_service_id(provider_name: str, service_name: str) -> int:
    out = _shell(
        "from beauty_api.models import BeautyService, BeautyProvider; "
        f"p = BeautyProvider.objects.filter(name='{provider_name}').order_by('id').first(); "
        f"print(BeautyService.objects.filter(provider=p, name='{service_name}').first().id)"
    )
    for line in out.splitlines():
        line = line.strip()
        if line.isdigit():
            return int(line)
    raise AssertionError(f"Could not resolve service id for {service_name}: {out}")


def _customer_login_via_api(email: str, password: str) -> str:
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={"email": email, "password": password, "device_id": TEST_DEVICE_ID},
        timeout=10,
    )
    assert resp.status_code == 200, f"Customer login failed: {resp.text}"
    cookie = resp.cookies.get('beauty_auth')
    assert cookie, 'login response missing beauty_auth cookie'
    return cookie


def _attach_customer_session(page, cookie_value: str) -> None:
    page.context.add_cookies([{
        "name": "beauty_auth",
        "value": cookie_value,
        "domain": "localhost",
        "path": "/",
        "httpOnly": False,
    }])
    page.add_init_script(
        f"window.localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');"
    )


# ---------------------------------------------------------------------------
# Per-test resource bag + cleanup
# ---------------------------------------------------------------------------

@pytest.fixture
def bag():
    state = {
        'customer_email': None,
        'customer_cookie': None,
        'business_email': None,
        'business_cookie': None,
        'provider_id': None,
        'service_id': None,
        'last_status': None,
    }
    yield state
    try:
        if state['customer_email']:
            _shell(
                "from beauty_api.models import BeautyFavorite, BeautyUser; "
                f"u = BeautyUser.objects.filter(email='{state['customer_email']}').first(); "
                "if u: BeautyFavorite.objects.filter(customer=u).delete()"
            )
            delete_test_users(state['customer_email'])
        if state['business_email']:
            delete_test_users(state['business_email'])
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Givens
# ---------------------------------------------------------------------------

@given('a beauty customer is logged in')
def given_customer_logged_in(page, bag):
    import uuid
    email = f"test_fav_cust_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = 'TestPass123!'
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={'email': email, 'password': password},
        timeout=10,
    )
    assert resp.status_code == 201, f"signup failed: {resp.text}"
    bag['customer_email'] = email
    cookie = _customer_login_via_api(email, password)
    bag['customer_cookie'] = cookie
    _attach_customer_session(page, cookie)
    bag['provider_id'] = _get_provider_id(GLOW_PROVIDER_NAME)
    bag['service_id'] = _get_service_id(GLOW_PROVIDER_NAME, SIGNATURE_FACIAL)


@given('a beauty business is logged in')
def given_business_logged_in(bag):
    import uuid
    email = f"test_fav_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = 'TestPass123!'
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={'email': email, 'password': password, 'business_name': 'Fav Test Biz'},
        timeout=10,
    )
    assert resp.status_code == 201, f"business signup failed: {resp.text}"
    bag['business_email'] = email
    bag['business_cookie'] = login_business_via_api(email, password)


@given(parsers.parse('the customer has favorited "{svc}" via API'))
def given_already_favorited(bag, svc):
    service_id = bag['service_id'] or _get_service_id(GLOW_PROVIDER_NAME, svc)
    cookie = bag['customer_cookie']
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/protected/services/{service_id}/favorite/",
        cookies={'beauty_auth': cookie},
        headers={'X-Device-ID': TEST_DEVICE_ID},
        timeout=10,
    )
    assert resp.status_code in (200, 201), f"seed favorite failed: {resp.text}"


# ---------------------------------------------------------------------------
# Whens
# ---------------------------------------------------------------------------

@when('the customer visits the Glow Facial Studio provider page')
def when_visit_provider(page, bag):
    page.goto(f"http://localhost:4200/pogoda/beauty/providers/{bag['provider_id']}")
    page.wait_for_timeout(1500)


@when(parsers.parse('the customer clicks the favorite toggle for "{svc}"'))
def when_click_fav(page, bag, svc):
    service_id = bag['service_id'] or _get_service_id(GLOW_PROVIDER_NAME, svc)
    sel = f"{service_favorite_btn}[data-service-id='{service_id}']"
    page.locator(sel).first.click()
    page.wait_for_timeout(1000)


@when('the customer reloads the provider page')
def when_reload(page, bag):
    page.goto(f"http://localhost:4200/pogoda/beauty/providers/{bag['provider_id']}")
    page.wait_for_timeout(1500)


@when('the customer opens the Saved Services page from Profile')
def when_open_saved_from_profile(page):
    page.goto("http://localhost:4200/pogoda/beauty/profile")
    page.wait_for_timeout(1500)
    page.locator(saved_services_link).first.click()
    page.wait_for_timeout(1500)


@when('the customer visits the Saved Services page directly')
def when_visit_saved_direct(page):
    page.goto("http://localhost:4200/pogoda/beauty/saved")
    page.wait_for_timeout(1500)


@when('the customer clicks the saved card')
def when_click_saved_card(page):
    page.locator(favorites_card).first.click()
    page.wait_for_timeout(1500)


@when(parsers.parse('the business attempts to POST a favorite for "{svc}"'))
def when_business_post(bag, svc):
    service_id = _get_service_id(GLOW_PROVIDER_NAME, svc)
    cookie = bag['business_cookie']
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/protected/services/{service_id}/favorite/",
        cookies={'beauty_auth': cookie},
        headers={'X-Device-ID': TEST_DEVICE_ID},
        timeout=10,
    )
    bag['last_status'] = resp.status_code


@when(parsers.parse('the customer POSTs a favorite for "{svc}"'))
def when_customer_post(bag, svc):
    service_id = bag['service_id'] or _get_service_id(GLOW_PROVIDER_NAME, svc)
    cookie = bag['customer_cookie']
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/protected/services/{service_id}/favorite/",
        cookies={'beauty_auth': cookie},
        headers={'X-Device-ID': TEST_DEVICE_ID},
        timeout=10,
    )
    bag['last_status'] = resp.status_code


@when(parsers.parse('the customer DELETEs the favorite for "{svc}"'))
def when_customer_delete(bag, svc):
    service_id = bag['service_id'] or _get_service_id(GLOW_PROVIDER_NAME, svc)
    cookie = bag['customer_cookie']
    resp = requests.delete(
        f"{BACKEND_URL}/api/beauty/protected/services/{service_id}/favorite/",
        cookies={'beauty_auth': cookie},
        headers={'X-Device-ID': TEST_DEVICE_ID},
        timeout=10,
    )
    bag['last_status'] = resp.status_code


# ---------------------------------------------------------------------------
# Thens
# ---------------------------------------------------------------------------

@then(parsers.parse('the favorite toggle for "{svc}" should be {state}'))
def then_toggle_state(page, bag, svc, state):
    service_id = bag['service_id'] or _get_service_id(GLOW_PROVIDER_NAME, svc)
    sel = f"{service_favorite_btn}[data-service-id='{service_id}']"
    expect(page.locator(sel).first).to_have_attribute('data-fav', state)


@then(parsers.parse('a saved card for "{svc}" should be visible'))
def then_saved_card_visible(page, svc):
    expect(page.locator(favorites_root)).to_be_visible()
    card = page.locator(favorites_card).filter(has_text=svc).first
    expect(card).to_be_visible()


@then(parsers.parse('the saved card should display the business "{biz}"'))
def then_saved_card_business(page, biz):
    expect(page.locator(favorites_business).filter(has_text=biz).first).to_be_visible()


@then(parsers.parse('the URL should match "{fragment}"'))
def then_url_matches(page, fragment):
    pattern = re.escape(fragment) + r"\d+"
    expect(page).to_have_url(re.compile(pattern))


@then('the saved-empty state should be visible')
def then_saved_empty(page):
    expect(page.locator(favorites_empty)).to_be_visible()


@then(parsers.parse('the API should respond with status {code:d}'))
def then_api_status(bag, code):
    assert bag['last_status'] == code, (
        f"expected {code}, got {bag['last_status']}"
    )
