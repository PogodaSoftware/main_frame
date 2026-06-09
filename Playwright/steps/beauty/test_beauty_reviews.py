"""Steps for the Beauty Customer Reviews feature.

Validates R1-R6 from the reviews handoff: eligibility-gated CTA, write
flow, duplicate-review rejection, owner-only delete, business-cannot-
write rejection, and business reply round-trip.

Seeded review rows are inserted via docker-exec Django shell so the
tests do not depend on an authenticated UI to set up state. Cleanup
runs in an autouse fixture that removes BeautyReview rows tied to the
test customer/business.
"""

from __future__ import annotations

import json
import re
import subprocess

import requests
from playwright.sync_api import expect
from pytest_bdd import scenarios, given, when, then, parsers

from Playwright.pages.pogoda.beauty.provider_detail_page import (
    leave_review_btn,
    provider_review_count,
    review_card as provider_review_card,
    review_delete_btn,
    reviews_empty,
    reviews_section,
)
from Playwright.pages.pogoda.beauty.review_write_page import (
    review_write_root,
    star_button_n,
    body_textarea,
    submit_button,
)
from Playwright.pages.pogoda.beauty.business_reviews_page import (
    business_reviews_root,
    review_card as business_review_card,
    reply_input,
    reply_submit,
    reply_block,
)

from .beauty_utils import (
    BACKEND_URL,
    TEST_DEVICE_ID,
    accept_application_via_api,
    attach_business_session_cookie,
    delete_test_users,
    login_business_via_api,
)

import pytest

scenarios("../../features/Beauty/beauty_reviews.feature")


# ---------------------------------------------------------------------------
# Constants — anchored to seed migration 0005_replace_categories.
# ---------------------------------------------------------------------------

GLOW_PROVIDER_NAME = 'Glow Facial Studio'
SIGNATURE_FACIAL = 'Signature Facial'


# ---------------------------------------------------------------------------
# Shell helpers
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


def _seed_completed_booking(customer_email: str, service_id: int) -> int:
    out = _shell(
        "from datetime import datetime, timedelta, timezone; "
        "from beauty_api.models import BeautyBooking, BeautyService, BeautyUser; "
        f"u = BeautyUser.objects.get(email='{customer_email}'); "
        f"s = BeautyService.objects.get(id={service_id}); "
        "b = BeautyBooking.objects.create(customer=u, service=s, "
        "    slot_at=datetime.now(timezone.utc) - timedelta(days=2), "
        "    status='completed', "
        "    service_name_at_booking=s.name, "
        "    service_price_cents_at_booking=s.price_cents, "
        "    service_duration_minutes_at_booking=s.duration_minutes); "
        "print(b.id)"
    )
    for line in out.splitlines():
        line = line.strip()
        if line.isdigit():
            return int(line)
    raise AssertionError(f"Could not seed completed booking: {out}")


def _seed_review(customer_email: str, service_id: int, rating: int, body: str) -> int:
    out = _shell(
        "from beauty_api.models import BeautyReview, BeautyService, BeautyUser; "
        f"u = BeautyUser.objects.get(email='{customer_email}'); "
        f"s = BeautyService.objects.get(id={service_id}); "
        f"r = BeautyReview.objects.create(customer=u, service=s, rating={rating}, "
        f"    body={json.dumps(body)}); "
        "print(r.id)"
    )
    for line in out.splitlines():
        line = line.strip()
        if line.isdigit():
            return int(line)
    raise AssertionError(f"Could not seed review: {out}")


def _link_business_to_provider(business_email: str, provider_name: str) -> None:
    _shell(
        "from beauty_api.models import BeautyProvider, BusinessProvider; "
        f"bp = BusinessProvider.objects.get(email='{business_email}'); "
        f"p = BeautyProvider.objects.filter(name='{provider_name}').order_by('id').first(); "
        "p.business_provider_id = bp.id; p.save(update_fields=['business_provider_id'])"
    )


def _unlink_provider(provider_name: str) -> None:
    _shell(
        "from beauty_api.models import BeautyProvider; "
        f"BeautyProvider.objects.filter(name='{provider_name}').update(business_provider_id=None)"
    )


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
def resource_bag():
    bag = {
        'customer_email': None,
        'business_email': None,
        'review_id': None,
        'booking_id': None,
        'provider_id': None,
        'service_id': None,
        'last_status': None,
    }
    yield bag
    try:
        if bag['customer_email']:
            _shell(
                "from beauty_api.models import BeautyReview, BeautyBooking, BeautyUser; "
                f"u = BeautyUser.objects.filter(email='{bag['customer_email']}').first(); "
                "if u: BeautyReview.objects.filter(customer=u).delete(); "
                "if u: BeautyBooking.objects.filter(customer=u).delete()"
            )
            delete_test_users(bag['customer_email'])
        if bag['business_email']:
            _unlink_provider(GLOW_PROVIDER_NAME)
            delete_test_users(bag['business_email'])
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Givens
# ---------------------------------------------------------------------------

@given('a beauty customer is logged in')
def given_customer_logged_in(page, resource_bag):
    import uuid
    email = f"test_review_cust_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = 'TestPass123!'
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={'email': email, 'password': password},
        timeout=10,
    )
    assert resp.status_code == 201, f"signup failed: {resp.text}"
    resource_bag['customer_email'] = email
    resource_bag['customer_password'] = password
    cookie = _customer_login_via_api(email, password)
    resource_bag['customer_cookie'] = cookie
    _attach_customer_session(page, cookie)


@given('a beauty business is logged in')
def given_business_logged_in(page, resource_bag):
    import uuid
    email = f"test_review_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = 'TestPass123!'
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={'email': email, 'password': password, 'business_name': 'Reviewer Test Biz'},
        timeout=10,
    )
    assert resp.status_code == 201, f"business signup failed: {resp.text}"
    resource_bag['business_email'] = email
    accept_application_via_api(email)
    cookie = login_business_via_api(email, password)
    resource_bag['business_cookie'] = cookie
    attach_business_session_cookie(page, cookie)


@given('the customer has no bookings')
def given_no_bookings(resource_bag):
    pass


@given(parsers.parse('the customer has a completed booking for "{svc}"'))
def given_completed_booking(resource_bag, svc):
    service_id = _get_service_id(GLOW_PROVIDER_NAME, svc)
    booking_id = _seed_completed_booking(resource_bag['customer_email'], service_id)
    resource_bag['service_id'] = service_id
    resource_bag['booking_id'] = booking_id
    resource_bag['provider_id'] = _get_provider_id(GLOW_PROVIDER_NAME)


@given(parsers.parse('the customer has already posted a {rating:d}-star review for "{svc}"'))
def given_existing_review(resource_bag, rating, svc):
    service_id = resource_bag.get('service_id') or _get_service_id(GLOW_PROVIDER_NAME, svc)
    review_id = _seed_review(
        resource_bag['customer_email'], service_id, rating, body=f'Auto-seeded {rating} star review',
    )
    resource_bag['service_id'] = service_id
    resource_bag['review_id'] = review_id


@given('a beauty business owns the Glow Facial Studio provider')
def given_business_owns_glow(page, resource_bag):
    import uuid
    email = f"test_review_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = 'TestPass123!'
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={'email': email, 'password': password, 'business_name': 'Glow Owner Test'},
        timeout=10,
    )
    assert resp.status_code == 201, f"business signup failed: {resp.text}"
    resource_bag['business_email'] = email
    accept_application_via_api(email)
    _link_business_to_provider(email, GLOW_PROVIDER_NAME)
    cookie = login_business_via_api(email, password)
    resource_bag['business_cookie'] = cookie


# ---------------------------------------------------------------------------
# Whens
# ---------------------------------------------------------------------------

@when('the customer visits the Glow Facial Studio provider page')
def when_visit_provider(page, resource_bag):
    provider_id = resource_bag.get('provider_id') or _get_provider_id(GLOW_PROVIDER_NAME)
    resource_bag['provider_id'] = provider_id
    page.goto(f"http://localhost:4200/pogoda/beauty/providers/{provider_id}")
    page.wait_for_timeout(1500)


@when('the customer clicks Leave-a-review')
def when_click_leave_review(page):
    page.locator(leave_review_btn).first.click()
    page.wait_for_timeout(2500)


@when(parsers.parse('the customer selects {n:d} stars'))
def when_select_stars(page, n):
    expect(page.locator(review_write_root)).to_be_visible()
    page.locator(star_button_n.format(n=n)).first.click()


@when(parsers.parse('the customer enters review text "{text}"'))
def when_enter_text(page, text):
    page.locator(body_textarea).fill(text)


@when('the customer submits the review')
def when_submit_review(page, resource_bag):
    page.locator(submit_button).click()
    page.wait_for_timeout(2000)


@when(parsers.parse('the customer attempts to POST a second review for "{svc}"'))
def when_dup_review(resource_bag, svc):
    service_id = resource_bag.get('service_id') or _get_service_id(GLOW_PROVIDER_NAME, svc)
    cookie = resource_bag['customer_cookie']
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/protected/services/{service_id}/reviews/",
        json={'rating': 3, 'body': 'dup'},
        cookies={'beauty_auth': cookie},
        headers={'X-Device-ID': TEST_DEVICE_ID},
        timeout=10,
    )
    resource_bag['last_status'] = resp.status_code


@when(parsers.parse('the business attempts to POST a review for "{svc}"'))
def when_business_post_review(resource_bag, svc):
    service_id = _get_service_id(GLOW_PROVIDER_NAME, svc)
    cookie = resource_bag['business_cookie']
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/protected/services/{service_id}/reviews/",
        json={'rating': 5, 'body': 'biz tried'},
        cookies={'beauty_auth': cookie},
        headers={'X-Device-ID': TEST_DEVICE_ID},
        timeout=10,
    )
    resource_bag['last_status'] = resp.status_code


@when('the customer deletes their own review')
def when_customer_delete(page):
    btn = page.locator(review_delete_btn).first
    btn.click()
    page.wait_for_timeout(2000)


@when('the business visits the Customer reviews page')
def when_business_visits_reviews(page, resource_bag):
    attach_business_session_cookie(page, resource_bag['business_cookie'])
    page.goto("http://localhost:4200/pogoda/beauty/business/reviews")
    page.wait_for_timeout(1500)


@when(parsers.parse('the business posts the reply "{reply}"'))
def when_business_replies(page, reply):
    page.locator(reply_input).first.fill(reply)
    page.locator(reply_submit).first.click()
    page.wait_for_timeout(1800)


# ---------------------------------------------------------------------------
# Thens
# ---------------------------------------------------------------------------

@then('the reviews section should be visible')
def then_reviews_section_visible(page):
    expect(page.locator(reviews_section)).to_be_visible()


@then('the reviews-empty state should be visible')
def then_reviews_empty(page):
    expect(page.locator(reviews_empty)).to_be_visible()


@then('the leave-review button should not be visible')
def then_no_leave_review(page):
    assert page.locator(leave_review_btn).count() == 0


@then('the customer should land on the Glow Facial Studio provider page')
def then_back_on_provider(page, resource_bag):
    expect(page).to_have_url(re.compile(rf"/providers/{resource_bag['provider_id']}(?:[/?#].*)?$"))


@then(parsers.parse('a review card with text "{needle}" should be visible'))
def then_review_card_text(page, needle):
    expect(page.locator(provider_review_card).filter(has_text=needle).first).to_be_visible()


@then('the provider review count should be at least 1')
def then_review_count_ge_1(page):
    txt = page.locator(provider_review_count).first.text_content() or ''
    nums = [int(x) for x in re.findall(r"\d+", txt)]
    assert nums and nums[0] >= 1, f"unexpected count text: {txt!r}"


@then(parsers.parse('the API should respond with status {code:d}'))
def then_api_status(resource_bag, code):
    assert resource_bag['last_status'] == code, (
        f"expected {code}, got {resource_bag['last_status']}"
    )


@then('a business review card should be visible')
def then_business_card_visible(page):
    expect(page.locator(business_reviews_root)).to_be_visible()
    expect(page.locator(business_review_card).first).to_be_visible()


@then(parsers.parse('the review reply block should display "{reply}"'))
def then_reply_visible(page, reply):
    expect(page.locator(reply_block).first).to_contain_text(reply)
