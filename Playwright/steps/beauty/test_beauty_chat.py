"""BDD steps for the Beauty per-booking chat feature.

Covers customer + business sides of the chat thread, the empty state
on the list screen, and the 24h-post-service auto-deletion rule.

Test data is created via Django shell (cheaper than driving the
booking flow through the UI for these tests). Each scenario gets a
fresh customer + business + storefront + service + booking.
"""

import os
import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route, selecting_different_routes, timeout_for_testing
from Playwright.pages.pogoda.beauty.chats_list_page import (
    chats_empty,
    chats_root,
    thread_card,
)
from Playwright.pages.pogoda.beauty.chat_thread_page import (
    chat_thread_root,
    composer,
    composer_disabled,
    input_box,
    phone_button,
    send_button,
)
from .beauty_utils import (
    BACKEND_URL,
    accept_application_via_api,
    attach_business_session_cookie,
    delete_test_users,
    login_business_via_api,
)
from ._auth_helpers import ui_login

scenarios("../../features/Pogoda/Beauty/beauty_chat.feature")


_MANAGE_PY_DIR = os.path.join(
    os.path.dirname(__file__), '..', '..', '..', 'Backend', 'controller'
)


def _shell(cmd: str) -> str:
    """Run ``manage.py shell -c`` and return its stdout."""
    result = subprocess.run(
        ["python", "manage.py", "shell", "-c", cmd],
        cwd=os.path.abspath(_MANAGE_PY_DIR),
        capture_output=True,
        timeout=60,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"shell cmd failed: {result.stderr}\n{result.stdout}")
    return result.stdout


def _create_storefront_and_service(business_email: str) -> tuple[int, int]:
    """Create a public storefront + service tied to ``business_email``.

    Returns ``(provider_id, service_id)``.
    """
    out = _shell(
        "from beauty_api.models import BusinessProvider, BeautyProvider, BeautyService; "
        f"bp = BusinessProvider.objects.get(email='{business_email}'); "
        "p, _ = BeautyProvider.objects.get_or_create("
        "    business_provider_id=bp.id, "
        "    defaults={'name': bp.business_name, 'location_label': 'Test City'}); "
        "s, _ = BeautyService.objects.get_or_create("
        "    provider=p, name='Chat Test Service', "
        "    defaults={'category':'nails','price_cents':5000,'duration_minutes':30}); "
        "print(f'IDS::{p.id}::{s.id}')"
    )
    line = next((ln for ln in out.splitlines() if ln.startswith('IDS::')), '')
    _, pid, sid = line.split('::')
    return int(pid), int(sid)


def _create_booking(customer_email: str, service_id: int, *, when: str = 'future') -> int:
    """Create a booking row directly. ``when='past'`` makes the slot 48h ago
    so chat retention has already expired."""
    if when == 'past':
        slot_expr = "now - timedelta(hours=48)"
    else:
        slot_expr = "now + timedelta(days=2)"
    out = _shell(
        "from datetime import datetime, timedelta, timezone; "
        "from beauty_api.models import BeautyUser, BeautyService, BeautyBooking; "
        f"u = BeautyUser.objects.get(email='{customer_email}'); "
        f"s = BeautyService.objects.get(id={service_id}); "
        "now = datetime.now(timezone.utc); "
        f"b = BeautyBooking.objects.create("
        f"    customer=u, service=s, slot_at={slot_expr}, "
        "    service_name_at_booking=s.name, "
        "    service_price_cents_at_booking=s.price_cents, "
        "    service_duration_minutes_at_booking=s.duration_minutes); "
        "print(f'BOOKING::{b.id}')"
    )
    line = next((ln for ln in out.splitlines() if ln.startswith('BOOKING::')), '')
    return int(line.split('::')[1])


@pytest.fixture(scope="function")
def chat_business():
    email = f"chat_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "ChatBiz123!"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={"email": email, "password": password, "business_name": "Chat Test Studio"},
        timeout=10,
    )
    assert resp.status_code == 201, f"biz setup failed: {resp.text}"
    accept_application_via_api(email)
    pid, sid = _create_storefront_and_service(email)
    yield {"email": email, "password": password, "provider_id": pid, "service_id": sid}
    delete_test_users(email)


@pytest.fixture(scope="function")
def chat_booking(test_customer, chat_business):
    booking_id = _create_booking(test_customer["email"], chat_business["service_id"])
    yield booking_id


@pytest.fixture(scope="function")
def chat_booking_past(test_customer, chat_business):
    booking_id = _create_booking(
        test_customer["email"], chat_business["service_id"], when='past',
    )
    yield booking_id


@given("an authenticated customer is on the chats list page")
def auth_customer_chats(page, test_customer):
    ui_login(page, test_customer["email"], test_customer["password"])
    selecting_different_routes(page, 'beauty_chats')
    timeout_for_testing(page)


@given("an authenticated customer with a booking is on the chats list page")
def auth_customer_with_booking(page, test_customer, chat_business, chat_booking):
    ui_login(page, test_customer["email"], test_customer["password"])
    selecting_different_routes(page, 'beauty_chats')
    timeout_for_testing(page)
    # Stash booking id for later steps via page meta.
    page.evaluate(f"window.__chatBookingId = {chat_booking}")


@given("an authenticated business with an incoming booking is on the chats list page")
def auth_business_chats(page, chat_business, test_customer, chat_booking):
    cookie = login_business_via_api(chat_business["email"], chat_business["password"])
    attach_business_session_cookie(page, cookie)
    goto_route(page, 'beauty_chats')
    timeout_for_testing(page)
    page.evaluate(f"window.__chatBookingId = {chat_booking}")


@given("an authenticated customer with a long-past booking is on the chats list page")
def auth_customer_with_past(page, test_customer, chat_business, chat_booking_past):
    ui_login(page, test_customer["email"], test_customer["password"])
    selecting_different_routes(page, 'beauty_chats')
    timeout_for_testing(page)


@when("the customer opens the chat thread for that booking")
@when("the business opens the chat thread for that booking")
def open_chat(page):
    booking_id = page.evaluate("window.__chatBookingId")
    page.locator(thread_card(int(booking_id))).click()
    page.wait_for_url("**/chats/**", timeout=10_000)
    timeout_for_testing(page)


@when('the customer types "Hi, do you accept walk-ins?" and clicks send')
def customer_send_msg(page):
    page.locator(input_box).fill("Hi, do you accept walk-ins?")
    page.locator(send_button).click()
    timeout_for_testing(page)


@when('the business types "Yes, see you Saturday" and clicks send')
def business_send_msg(page):
    page.locator(input_box).fill("Yes, see you Saturday")
    page.locator(send_button).click()
    timeout_for_testing(page)


@when("the customer navigates directly to a chat thread URL for an unknown booking")
def goto_unknown_thread(page):
    selecting_different_routes(page, 'beauty_chat_thread', 999_999_999)
    timeout_for_testing(page)


@then("the chats list page should be visible")
def verify_chats_list(page):
    expect(page.locator(chats_root).first).to_be_visible()


@then("the chats empty state should be visible")
def verify_chats_empty(page):
    expect(page.locator(chats_empty)).to_be_visible()


@then("the chat thread page should be visible")
def verify_chat_thread(page):
    expect(page.locator(chat_thread_root)).to_be_visible()


@then("the message composer should be visible")
def verify_composer(page):
    expect(page.locator(composer)).to_be_visible()


@then("the phone placeholder button should be disabled")
def verify_phone_disabled(page):
    expect(page.locator(phone_button)).to_be_disabled()


@then("the sent message should be visible in the thread")
def verify_msg_visible(page):
    # Either side: the latest body text shows up inside a bubble.
    body = page.locator("css=.bubble").last
    expect(body).to_be_visible()
