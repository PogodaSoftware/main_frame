"""
BDD steps for Playwright/features/Beauty/beauty_role_separation.feature.

Covers acceptance scenarios V1, V3, V4, V7, V8, V9, V11 from the
customer/business role-separation handoff. The audit-log assertion
shells into the backend container to query the DB so the test does
not need a service account or extra REST surface.
"""

from __future__ import annotations

import json
import subprocess
import time
import uuid

import pytest
import requests
from pytest_bdd import given, parsers, scenarios, then, when

from .beauty_utils import BACKEND_URL, TEST_DEVICE_ID, delete_test_users

scenarios("../../features/Beauty/beauty_role_separation.feature")


GENERIC_AUTH_DETAIL = 'Invalid email or password.'
GENERIC_DUPLICATE_DETAIL = 'An account with this email already exists.'


# Per-scenario state. pytest-bdd resets the module between scenarios via
# the `_state` fixture so cross-scenario leakage is impossible.
@pytest.fixture
def _state():
    return {}


@pytest.fixture
def fake_ip():
    """Unique X-Forwarded-For value per scenario.

    The auth rate-limit is keyed by client IP and lives in Django's
    process-local cache (`LocMemCache`). Running ``cache.clear()`` from
    a manage.py shell does NOT touch the runserver process' cache, so
    cross-scenario cleanup via the shell is a no-op. Instead we hand
    each scenario its own synthetic source IP so the per-IP counter is
    untouchable by previous scenarios. ``client_ip()`` honours the
    leftmost ``X-Forwarded-For`` entry."""
    return f'10.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}.{uuid.uuid4().int % 256}'


# -- factories used as cross-role fixtures ------------------------------

def _create_business(state: dict, key_prefix: str = 'biz') -> dict:
    email = f'test_xrole_{key_prefix}_{uuid.uuid4().hex[:8]}@beauty-test.com'
    password = 'TestPass123!'
    resp = requests.post(
        f'{BACKEND_URL}/api/beauty/business/signup/',
        json={'email': email, 'password': password, 'business_name': 'XRole Studio'},
        timeout=10,
    )
    assert resp.status_code == 201, f'Setup business signup failed: {resp.text}'
    state['biz'] = {'email': email, 'password': password}
    return state['biz']


def _create_customer(state: dict, key_prefix: str = 'cust') -> dict:
    email = f'test_xrole_{key_prefix}_{uuid.uuid4().hex[:8]}@beauty-test.com'
    password = 'TestPass123!'
    resp = requests.post(
        f'{BACKEND_URL}/api/beauty/signup/',
        json={'email': email, 'password': password},
        timeout=10,
    )
    assert resp.status_code == 201, f'Setup customer signup failed: {resp.text}'
    state['cust'] = {'email': email, 'password': password}
    return state['cust']


# -- givens -------------------------------------------------------------

@given('a test business provider account exists for cross-role check')
def biz_for_signup_check(_state):
    _create_business(_state, 'sgn')


@given('a test customer account exists for cross-role check')
def cust_for_signup_check(_state):
    _create_customer(_state, 'sgn')


@given('a test business provider account exists for cross-role login')
def biz_for_login_check(_state):
    _create_business(_state, 'lgn')


@given('a test customer account exists for cross-role login')
def cust_for_login_check(_state):
    _create_customer(_state, 'lgn')


@given('a test business provider account exists for rate-limit check')
def biz_for_rate_limit(_state):
    _create_business(_state, 'rt')


@given('a test business provider account exists for audit check')
def biz_for_audit(_state):
    _create_business(_state, 'aud')


@given('a test customer account exists for role-claim check')
def cust_for_role_claim(_state):
    _create_customer(_state, 'rc')


# -- whens --------------------------------------------------------------

@when('I POST that business email to the customer signup endpoint')
def post_biz_email_to_customer_signup(_state):
    email = _state['biz']['email']
    resp = requests.post(
        f'{BACKEND_URL}/api/beauty/signup/',
        json={'email': email, 'password': 'AnotherPass1!'},
        timeout=10,
    )
    _state['signup_resp'] = resp


@when('I POST that customer email to the business signup endpoint')
def post_cust_email_to_business_signup(_state):
    email = _state['cust']['email']
    resp = requests.post(
        f'{BACKEND_URL}/api/beauty/business/signup/',
        json={'email': email, 'password': 'AnotherPass1!', 'business_name': 'Conflict Co'},
        timeout=10,
    )
    _state['signup_resp'] = resp


def _xff_headers(fake_ip: str) -> dict:
    return {'X-Forwarded-For': fake_ip}


@when('I POST those business credentials to the customer login endpoint')
def post_biz_creds_to_customer_login(_state, fake_ip):
    biz = _state['biz']
    resp = requests.post(
        f'{BACKEND_URL}/api/beauty/login/',
        json={
            'email': biz['email'],
            'password': biz['password'],
            'device_id': TEST_DEVICE_ID,
        },
        headers=_xff_headers(fake_ip),
        timeout=10,
    )
    _state['login_resp'] = resp


@when('I POST those customer credentials to the business login endpoint')
def post_cust_creds_to_business_login(_state, fake_ip):
    cust = _state['cust']
    resp = requests.post(
        f'{BACKEND_URL}/api/beauty/business/login/',
        json={
            'email': cust['email'],
            'password': cust['password'],
            'device_id': TEST_DEVICE_ID,
        },
        headers=_xff_headers(fake_ip),
        timeout=10,
    )
    _state['login_resp'] = resp


@when(parsers.parse(
    'I send {count:d} cross-role login attempts using that business email '
    'to the customer login endpoint'
))
def send_n_cross_role_attempts(_state, fake_ip, count):
    biz = _state['biz']
    last = None
    for _ in range(count):
        last = requests.post(
            f'{BACKEND_URL}/api/beauty/login/',
            json={
                'email': biz['email'],
                'password': biz['password'],
                'device_id': TEST_DEVICE_ID,
            },
            headers=_xff_headers(fake_ip),
            timeout=10,
        )
    _state['login_resp'] = last


@when('I send one more cross-role login attempt to the customer login endpoint')
def send_one_more_cross_role(_state, fake_ip):
    biz = _state['biz']
    resp = requests.post(
        f'{BACKEND_URL}/api/beauty/login/',
        json={
            'email': biz['email'],
            'password': biz['password'],
            'device_id': TEST_DEVICE_ID,
        },
        headers=_xff_headers(fake_ip),
        timeout=10,
    )
    _state['final_resp'] = resp


@when('I log in as that customer via the customer login endpoint')
def login_as_customer(_state, fake_ip):
    cust = _state['cust']
    resp = requests.post(
        f'{BACKEND_URL}/api/beauty/login/',
        json={
            'email': cust['email'],
            'password': cust['password'],
            'device_id': TEST_DEVICE_ID,
        },
        headers=_xff_headers(fake_ip),
        timeout=10,
    )
    assert resp.status_code == 200, f'Customer login failed: {resp.text}'
    _state['session_cookie'] = resp.cookies.get('beauty_auth')
    assert _state['session_cookie'], 'Missing beauty_auth cookie on login'


@when('I call the business dashboard endpoint with the customer session')
def call_business_endpoint(_state):
    resp = requests.get(
        f'{BACKEND_URL}/api/beauty/protected/business/dashboard/',
        cookies={'beauty_auth': _state['session_cookie']},
        headers={'X-Device-Id': TEST_DEVICE_ID},
        timeout=10,
    )
    _state['business_resp'] = resp


# -- thens --------------------------------------------------------------

def _cleanup(state: dict) -> None:
    for key in ('biz', 'cust'):
        info = state.get(key)
        if info and info.get('email'):
            delete_test_users(info['email'])


@then('the cross-role signup response status should be 409')
def assert_signup_409(_state):
    resp = _state['signup_resp']
    try:
        assert resp.status_code == 409, f'Expected 409, got {resp.status_code}: {resp.text}'
    finally:
        _cleanup(_state)


@then('the cross-role signup response detail should be the generic duplicate message')
def assert_signup_generic_detail(_state):
    body = _state['signup_resp'].json()
    assert body.get('detail') == GENERIC_DUPLICATE_DETAIL, (
        f'Expected generic duplicate detail, got: {body}'
    )


@then('the cross-role login response status should be 401')
def assert_login_401(_state):
    resp = _state['login_resp']
    try:
        assert resp.status_code == 401, f'Expected 401, got {resp.status_code}: {resp.text}'
    finally:
        _cleanup(_state)


@then('the cross-role login response detail should be the generic auth failure message')
def assert_login_generic_detail(_state):
    body = _state['login_resp'].json()
    assert body.get('detail') == GENERIC_AUTH_DETAIL, (
        f'Expected generic auth failure detail, got: {body}'
    )


@then('the final cross-role login response status should be 429')
def assert_final_429(_state):
    resp = _state['final_resp']
    try:
        assert resp.status_code == 429, (
            f'Expected 429 after threshold, got {resp.status_code}: {resp.text}'
        )
    finally:
        # Best-effort cooldown so a follow-on test from the same IP is
        # not greeted with a leftover 429. The cache TTL is 5 minutes so
        # this just clears the in-memory counter; we don't actually wait.
        _cleanup(_state)


@then('an audit row should exist for that masked email and the cross_role_login event')
def assert_audit_row(_state):
    biz = _state['biz']
    local = biz['email'].split('@', 1)[0]
    masked = f'{local[0]}***@' + biz['email'].split('@', 1)[1]
    cmd = (
        'import json; from beauty_api.models import BeautyAuthAuditLog; '
        f"row = BeautyAuthAuditLog.objects.filter(event_type='cross_role_login', "
        f"masked_email='{masked}').order_by('-created_at').first(); "
        "print(json.dumps({'found': bool(row), 'masked': row.masked_email if row else '', "
        "'attempted': row.attempted_role if row else '', "
        "'existing': row.existing_role if row else ''}))"
    )
    # Small wait — audit insert happens inside the request handler so by
    # the time the HTTP response returned the row should already be
    # committed. Retry a couple of times just to absorb DB write skew.
    out = ''
    for _ in range(3):
        result = subprocess.run(
            ['docker', 'exec', 'main_frame-backend-1',
             'python', 'manage.py', 'shell', '-c', cmd],
            capture_output=True, timeout=30, text=True,
        )
        out = (result.stdout or '').strip().splitlines()[-1] if result.stdout else ''
        if out:
            break
        time.sleep(0.5)

    try:
        payload = json.loads(out) if out else {}
    except json.JSONDecodeError as exc:
        raise AssertionError(f'Could not parse audit shell output: {out!r} ({exc})')

    try:
        assert payload.get('found'), f'No audit row found for masked email {masked}: {payload}'
        assert payload['attempted'] == 'customer'
        assert payload['existing'] == 'business'
    finally:
        _cleanup(_state)


@then('the business dashboard response status should be 403')
def assert_business_403(_state):
    resp = _state['business_resp']
    try:
        assert resp.status_code == 403, (
            f'Expected 403, got {resp.status_code}: {resp.text}'
        )
    finally:
        _cleanup(_state)
