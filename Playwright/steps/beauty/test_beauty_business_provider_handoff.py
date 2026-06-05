"""End-to-end regression tests for the Business Provider Portal mobile
handoff (Beauty App Design System · Business Provider Portal).

Covers behaviors added or changed during the handoff implementation pass:

- ITIN/EIN field on wizard step 1 is locked to 9 digits, strips letters,
  blocks paste of mixed input.
- Wizard end-to-end happy path (entity through review → submit) lands on
  the business home dashboard.
- Service CRUD round-trip (add → edit → delete) with DB assertions on the
  ``BeautyService`` rows.
- Password change form renders the 4-segment strength meter and the
  matching hint copy as the password gains strength.
- Provider chat thread surfaces seeded ``BeautyChatMessage`` rows for a
  booked appointment.
- ``BeautyProviderToastService`` (exposed at ``window.beautyToastSvc``)
  renders the in-app toast over Dashboard and Services routes.

Tests run against the live Docker stack — no backend mocking. Each test
creates a fresh ``BusinessProvider`` row so JWT rotations between runs
don't leak session state.
"""

import uuid

import pytest
import requests
from playwright.sync_api import expect

from Playwright.Hooks.hooks import goto_route, timeout_for_testing
from .beauty_utils import (
    BACKEND_URL,
    accept_application_via_api,
    attach_business_session_cookie,
    delete_test_users,
    login_business_via_api,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="function")
def fresh_business():
    """Sign up a fresh ``BusinessProvider`` row and clean it up after."""
    email = f"handoff_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "HandoffPass123!"
    name = "Handoff Studio"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={"email": email, "password": password, "business_name": name},
        timeout=10,
    )
    assert resp.status_code == 201, f"Signup failed: {resp.text}"
    yield {"email": email, "password": password, "business_name": name}
    delete_test_users(email)


@pytest.fixture(scope="function")
def accepted_business(fresh_business):
    """Fresh business with wizard auto-accepted so /business is reachable."""
    accept_application_via_api(fresh_business["email"])
    return fresh_business


@pytest.fixture(scope="function")
def signed_in_business(page, accepted_business):
    cookie = login_business_via_api(
        accepted_business["email"], accepted_business["password"]
    )
    attach_business_session_cookie(page, cookie)
    return accepted_business


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _shell_exec(cmd: str) -> str:
    """Execute Django shell against the backend container, return stdout."""
    import subprocess

    out = subprocess.run(
        [
            "docker",
            "exec",
            "main_frame-backend-1",
            "python",
            "manage.py",
            "shell",
            "-c",
            cmd,
        ],
        capture_output=True,
        timeout=30,
        text=True,
    )
    return out.stdout


def _sign_in_fresh_via_ui(page, email: str, password: str, business_name: str):
    """Walk the signup form so the test exercises the same surface a user does."""
    goto_route(page, 'beauty_business_signup')
    page.wait_for_timeout(1500)
    page.get_by_role('textbox', name='Business name').fill(business_name)
    page.get_by_role('textbox', name='Business email').fill(email)
    page.get_by_role('textbox', name='Password').fill(password)
    page.get_by_role('checkbox', name='I agree to the Terms and').check()
    page.get_by_role('button', name='Create account').click()
    page.wait_for_url('**/business/apply/entity', timeout=10_000)


# ---------------------------------------------------------------------------
# wiz-1 / wiz-1-registered — ITIN 9-digit cap
# ---------------------------------------------------------------------------


def test_itin_field_locks_to_nine_digits_via_typing(page):
    """Typing letters + extra digits into ITIN never yields more than 9 chars."""
    # Fresh signup so we land on wiz-1 with no prior state.
    email = f"itin_typing_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "ItinPass123!"
    try:
        _sign_in_fresh_via_ui(page, email, password, "ITIN Typing Studio")

        # Switch to the registered-business branch which surfaces the ITIN input.
        page.get_by_role('radio', name='A registered business').check()
        itin = page.locator('#itin')
        expect(itin).to_be_visible()

        itin.click()
        itin.press_sequentially("ab12cd34ef56gh78ij90kl", delay=10)

        value = itin.input_value()
        assert value == "123456789", f"Expected 9-digit cap, got {value!r}"
        assert len(value) == 9
        assert value.isdigit()
    finally:
        delete_test_users(email)


def test_itin_field_strips_pasted_non_digits(page):
    """Paste of mixed input is stripped + capped at 9 digits via the paste handler."""
    email = f"itin_paste_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "ItinPaste123!"
    try:
        _sign_in_fresh_via_ui(page, email, password, "ITIN Paste Studio")
        page.get_by_role('radio', name='A registered business').check()
        itin = page.locator('#itin')
        expect(itin).to_be_visible()
        itin.click()

        # Simulate a paste event with letters + many digits.
        page.evaluate(
            """
            (() => {
              const el = document.getElementById('itin');
              el.focus();
              const dt = new DataTransfer();
              dt.setData('text/plain', '12-34a56b7890XX1');
              el.dispatchEvent(new ClipboardEvent('paste', {
                clipboardData: dt, bubbles: true, cancelable: true,
              }));
            })()
            """
        )
        # Allow the change-detection tick.
        page.wait_for_timeout(200)
        value = itin.input_value()
        assert value == "123456789", f"Paste cap broke: got {value!r}"
    finally:
        delete_test_users(email)


# ---------------------------------------------------------------------------
# Wizard happy path → dashboard
# ---------------------------------------------------------------------------


def test_wizard_full_flow_lands_on_dashboard(page, fresh_business):
    """Walk every wizard step UI → assert backend application accepted_at set."""
    biz = fresh_business
    cookie = login_business_via_api(biz["email"], biz["password"])
    attach_business_session_cookie(page, cookie)

    goto_route(page, 'beauty_business_apply_entity')
    page.wait_for_url('**/apply/entity', timeout=10_000)
    page.wait_for_timeout(1000)

    page.get_by_role('textbox', name='First name').fill('Maya')
    page.get_by_role('textbox', name='Last name').fill('Rivera')
    page.get_by_role('button', name='Save & Continue').click()
    page.wait_for_url('**/apply/services', timeout=10_000)

    # Pick at least one category to enable the CTA.
    page.locator('input[type=checkbox][name^="cat-"]').first.check()
    page.get_by_role('button', name='Save & Continue').click()
    page.wait_for_url('**/apply/stripe', timeout=10_000)
    page.get_by_role('button', name='Mark complete').click()
    page.wait_for_url('**/apply/schedule', timeout=10_000)
    page.get_by_role('button', name='Save & Continue').click()
    page.wait_for_url('**/apply/tools', timeout=10_000)
    page.get_by_role('button', name='Save & Continue').click()
    page.wait_for_url('**/apply/review', timeout=10_000)

    page.get_by_role('checkbox', name='Terms').check()
    page.get_by_role('button', name='Submit application').click()
    page.wait_for_url('**/business', timeout=10_000)
    page.wait_for_timeout(1000)

    # Backend assertion: the application row is now in accepted state.
    out = _shell_exec(
        "from beauty_api.models import BusinessProvider, BusinessProviderApplication; "
        f"bp = BusinessProvider.objects.get(email='{biz['email']}'); "
        "app = BusinessProviderApplication.objects.get(business_provider=bp); "
        "print('STATUS:', app.status); print('ACCEPTED:', bool(app.accepted_at))"
    )
    assert "STATUS: accepted" in out, out
    assert "ACCEPTED: True" in out, out

    # UI assertion: dashboard chrome rendered.
    expect(page.get_by_text('BUSINESS PORTAL', exact=False)).to_be_visible()


# ---------------------------------------------------------------------------
# Services CRUD round-trip
# ---------------------------------------------------------------------------


def test_service_create_edit_delete_round_trip(page, signed_in_business):
    """Create a service via the form → edit → delete; DB row state matches each step."""
    biz = signed_in_business
    goto_route(page, 'beauty_business_services')
    timeout_for_testing(page)

    # Empty state → click "Add your first service" or top "Add service".
    add_btn = page.get_by_role('button', name='Add service').first
    if not add_btn.is_visible():
        add_btn = page.get_by_role('button', name='Add your first service')
    add_btn.click()
    page.wait_for_url(lambda url: '/services/' in url and '/business/services' != url.rstrip('/').split('?')[0].rstrip('/'), timeout=10_000)
    timeout_for_testing(page)

    page.get_by_role('textbox', name='Service name').fill('Glow Facial')
    page.get_by_label('Category').select_option('Facial')
    page.get_by_role('textbox', name='Price').fill('99.99')
    page.get_by_role('textbox', name='Duration').fill('30')
    page.get_by_role('button', name='Create service').click()
    page.wait_for_url(lambda url: url.rstrip('/').endswith('/business/services'), timeout=10_000)
    timeout_for_testing(page)
    expect(page.get_by_text('Glow Facial')).to_be_visible()

    # DB row should exist with correct snapshot fields.
    out = _shell_exec(
        "from beauty_api.models import BeautyService, BeautyProvider, BusinessProvider; "
        f"bp = BusinessProvider.objects.get(email='{biz['email']}'); "
        "prov = BeautyProvider.objects.get(business_provider_id=bp.id); "
        "svc = BeautyService.objects.filter(provider=prov, name='Glow Facial').first(); "
        "print('ID:', svc.id, 'PRICE:', svc.price_cents, 'DUR:', svc.duration_minutes)"
    )
    assert "PRICE: 9999" in out, out
    assert "DUR: 30" in out, out

    # UI assertion: row visible w/ price.
    expect(page.get_by_text('$99.99', exact=False)).to_be_visible()

    # Edit → rename → save.
    page.get_by_role('button', name='Edit', exact=True).first.click()
    page.wait_for_url(lambda url: '/edit' in url, timeout=10_000)
    timeout_for_testing(page)
    name_input = page.get_by_role('textbox', name='Service name')
    name_input.fill('Glow Plus Facial')
    page.get_by_role('button', name='Save').click()
    page.wait_for_url('**/business/services', timeout=10_000)
    timeout_for_testing(page)

    out = _shell_exec(
        "from beauty_api.models import BeautyService, BeautyProvider, BusinessProvider; "
        f"bp = BusinessProvider.objects.get(email='{biz['email']}'); "
        "prov = BeautyProvider.objects.get(business_provider_id=bp.id); "
        "print('RENAMED:', BeautyService.objects.filter(provider=prov, name='Glow Plus Facial').exists())"
    )
    assert "RENAMED: True" in out, out

    # Delete via row "Delete" button → confirm in modal.
    page.get_by_role('button', name='Delete').first.click()
    page.wait_for_timeout(500)
    page.get_by_role('button', name='Yes, delete').click()
    page.wait_for_timeout(2000)

    out = _shell_exec(
        "from beauty_api.models import BeautyService, BeautyProvider, BusinessProvider; "
        f"bp = BusinessProvider.objects.get(email='{biz['email']}'); "
        "prov = BeautyProvider.objects.get(business_provider_id=bp.id); "
        "print('REMAINING:', BeautyService.objects.filter(provider=prov).count())"
    )
    assert "REMAINING: 0" in out, out


# ---------------------------------------------------------------------------
# Change password strength meter
# ---------------------------------------------------------------------------


def test_change_password_strength_meter_renders(page, signed_in_business):
    """Strength meter + hint copy reflect password complexity in real time."""
    goto_route(page, 'beauty_business_change_password')
    timeout_for_testing(page)

    new = page.locator('#new_password')
    new.fill('short')
    expect(page.locator('.strength-hint')).to_have_text(
        'Weak password — add length and variety.'
    )

    new.fill('longerpw123')
    page.wait_for_timeout(200)
    hint = page.locator('.strength-hint').text_content() or ''
    assert hint, "Strength hint must be visible after typing"

    new.fill('VeryStr0ng!Pass1234')
    expect(page.locator('.strength-hint')).to_have_text(
        'Strong password — looks good.'
    )

    # 4 strength segments rendered.
    segs = page.locator('.strength .seg')
    expect(segs).to_have_count(4)


# ---------------------------------------------------------------------------
# Provider chat thread surfaces seeded messages
# ---------------------------------------------------------------------------


def test_provider_chat_thread_shows_seeded_messages(page, signed_in_business):
    """Seed a booking + 2 chat messages → provider thread renders both bodies."""
    biz = signed_in_business

    # Seed: create a customer, a provider service, a booking, two messages.
    seed = _shell_exec(
        "from datetime import datetime, timezone; "
        "from django.contrib.auth.hashers import make_password; "
        "from beauty_api.models import (BeautyUser, BusinessProvider, BeautyProvider, "
        "BeautyService, BeautyBooking, BeautyChatMessage); "
        f"bp = BusinessProvider.objects.get(email='{biz['email']}'); "
        "prov, _ = BeautyProvider.objects.get_or_create("
        "    business_provider_id=bp.id, defaults={'name': bp.business_name}); "
        "svc, _ = BeautyService.objects.get_or_create("
        "    provider=prov, name='Seeded Svc', "
        "    defaults={'category':'facial','price_cents':5000,'duration_minutes':30}); "
        f"cust, _ = BeautyUser.objects.get_or_create(email='handoff_cust_{uuid.uuid4().hex[:6]}@beauty-test.com', "
        "    defaults={'password': make_password('x')}); "
        "bk = BeautyBooking.objects.create("
        "    customer=cust, service=svc, "
        "    slot_at=datetime(2026,5,28,15,0,tzinfo=timezone.utc), "
        "    service_name_at_booking=svc.name, "
        "    service_price_cents_at_booking=svc.price_cents, "
        "    service_duration_minutes_at_booking=svc.duration_minutes, "
        "    status='booked'); "
        "BeautyChatMessage.objects.create(booking=bk, sender_type='customer', sender_id=cust.id, body='HELLO_FROM_TEST_CUSTOMER'); "
        "BeautyChatMessage.objects.create(booking=bk, sender_type='business', sender_id=bp.id, body='REPLY_FROM_TEST_BUSINESS'); "
        "print('CUST:', cust.id, 'BK:', bk.id)"
    )
    assert 'BK:' in seed, seed
    booking_id = int(seed.split('BK:')[1].strip().split()[0])

    goto_route(page, 'beauty_chat_thread', bookingId=booking_id)
    timeout_for_testing(page)

    expect(page.get_by_text('HELLO_FROM_TEST_CUSTOMER')).to_be_visible()
    expect(page.get_by_text('REPLY_FROM_TEST_BUSINESS')).to_be_visible()


# ---------------------------------------------------------------------------
# In-app toast service
# ---------------------------------------------------------------------------


@pytest.mark.parametrize('route_key', ['beauty_business_home', 'beauty_business_services'])
def test_provider_toast_renders_on_any_provider_route(page, signed_in_business, route_key):
    """``window.beautyToastSvc.show`` renders the toast over Dashboard + Services."""
    goto_route(page, route_key)
    timeout_for_testing(page)

    page.evaluate(
        """() => {
          window.beautyToastSvc.show({
            conversationId: 1,
            sender: 'Maya R.',
            service: 'Brightening Peel · Thu 10:30',
            preview: 'Quick question about prep tomorrow.',
            time: 'now',
          });
        }"""
    )
    page.wait_for_timeout(300)

    toast = page.locator('app-prov-new-message-toast .toast-frame')
    expect(toast).to_be_visible()
    expect(toast).to_contain_text('Maya R.')
    expect(toast).to_contain_text('Reply')
    expect(toast).to_contain_text('Mark as read')


# ---------------------------------------------------------------------------
# Sign-out + delete-account confirmation modals
# ---------------------------------------------------------------------------


def test_sign_out_modal_opens_and_cancels(page, signed_in_business):
    goto_route(page, 'beauty_business_settings')
    timeout_for_testing(page)

    page.get_by_role('button', name='Sign out').first.click()
    page.wait_for_timeout(400)
    expect(page.get_by_text('Sign out?')).to_be_visible()
    page.get_by_role('button', name='Stay signed in').click()
    page.wait_for_timeout(400)

    # After cancel, settings list still rendered.
    expect(page.get_by_text('DANGER ZONE', exact=False)).to_be_visible()


def test_delete_account_modal_opens_and_cancels(page, signed_in_business):
    goto_route(page, 'beauty_business_settings')
    timeout_for_testing(page)

    page.get_by_role('button', name='Delete account').first.click()
    page.wait_for_timeout(400)
    expect(page.get_by_text('Delete account?')).to_be_visible()
    page.get_by_role('button', name='Keep my account').click()
    page.wait_for_timeout(400)

    expect(page.get_by_text('DANGER ZONE', exact=False)).to_be_visible()
