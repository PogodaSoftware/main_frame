"""End-to-end tests for Beauty Admin Portal — In-app messaging.

Covers:
  - Customer detail: button disabled (no booking), button enabled + sends → 201,
    BeautyChatMessage(sender_type='admin') persists, message.send audit event logged.
  - Provider detail: same for business target.

Fixture pattern mirrors test_beauty_admin_portal_customer_detail.py:
  - throwaway admin customer → BeautyAdminPrincipal owner
  - throwaway target (customer OR BusinessProvider)
  - messageable booking seeded via _shell: BeautyBooking(status='booked', slot_at=now)
    For provider: BeautyProvider(business_provider_id=bp.id) + BeautyService under it.
  - autouse cleanup deletes booking (cascades messages), audit events, principal, users.
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_customer_detail_page import (
    cd_msg_btn,
    cd_msg_composer,
    cd_msg_send,
    cd_msg_sent,
    cd_msg_ta,
    cd_root,
)
from Playwright.pages.pogoda.beauty.admin_portal_provider_detail_page import (
    pd_msg_btn,
    pd_msg_composer,
    pd_msg_send,
    pd_msg_sent,
    pd_msg_ta,
    pd_root,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_portal_messaging.feature")

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


def _seed_admin_session(page, admin_email: str, password: str) -> int:
    """Signup + make admin principal + inject session cookie. Returns admin BeautyUser.id."""
    assert requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": admin_email, "password": password}, timeout=10,
    ).status_code == 201
    admin_id = int(_shell(
        "from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(email='{admin_email}').id)"
    ))
    principal_id = int(_shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "p,_=BeautyAdminPrincipal.objects.update_or_create("
        f"user_type='customer', user_id={admin_id}, defaults={{'role':'owner'}}); print(p.id)"
    ))
    login = requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={"email": admin_email, "password": password, "device_id": TEST_DEVICE_ID},
        timeout=10,
    )
    assert login.status_code == 200, f"Login failed: {login.text}"
    page.context.add_cookies([{
        "name": BEAUTY_SESSION_COOKIE, "value": login.cookies.get(BEAUTY_SESSION_COOKIE),
        "domain": "localhost", "path": "/", "httpOnly": False,
    }])
    page.add_init_script(f"window.localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');")
    return principal_id


# ─────────────────────────────────────────────────────────────────────────────
# Customer fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="function")
def admin_on_customer_no_booking(page):
    """Admin + a target customer with NO booking (gate should be closed)."""
    tag = uuid.uuid4().hex[:6]
    admin_email = f"msgadm_{tag}@beauty-test.com"
    target_email = f"msgcust0_{tag}@beauty-test.com"
    password = "MsgPass123!"

    principal_id = _seed_admin_session(page, admin_email, password)

    assert requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": target_email, "password": password}, timeout=10,
    ).status_code == 201
    target_id = int(_shell(
        "from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(email='{target_email}').id)"
    ))
    _STATE.update({
        "admin_email": admin_email, "target_email": target_email,
        "principal_id": principal_id, "target_id": target_id,
        "booking_id": None,
    })
    yield _STATE

    _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')"
    )
    delete_test_users(admin_email)
    delete_test_users(target_email)


@pytest.fixture(scope="function")
def admin_on_customer_with_booking(page):
    """Admin + target customer + a messageable BeautyBooking (status=booked, slot_at=now)."""
    tag = uuid.uuid4().hex[:6]
    admin_email = f"msgadm_{tag}@beauty-test.com"
    target_email = f"msgcust_{tag}@beauty-test.com"
    password = "MsgPass123!"

    principal_id = _seed_admin_session(page, admin_email, password)

    assert requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": target_email, "password": password}, timeout=10,
    ).status_code == 201
    target_id = int(_shell(
        "from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(email='{target_email}').id)"
    ))

    # Seed a BeautyProvider + BeautyService for the booking's service FK.
    # Provider does not need a BusinessProvider link for customer-side threading.
    bp_id = int(_shell(
        "from beauty_api.models import BusinessProvider; "
        f"bp=BusinessProvider.objects.create(email='msgprov_{tag}@beauty-test.com', "
        f"password='x', business_name='Msg Studio {tag}'); print(bp.id)"
    ))
    prov_id = int(_shell(
        "from beauty_api.models import BeautyProvider; "
        f"p=BeautyProvider.objects.create(name='Msg Studio {tag}', "
        f"business_provider_id={bp_id}); print(p.id)"
    ))
    svc_id = int(_shell(
        "from beauty_api.models import BeautyService, BeautyProvider; "
        f"p=BeautyProvider.objects.get(id={prov_id}); "
        "s=BeautyService.objects.create(provider=p, name='Test Svc', "
        "category='facial', duration_minutes=30, price_cents=5000); print(s.id)"
    ))
    # slot_at = now → is_chat_active = True (within 24h window)
    booking_id = int(_shell(
        "from django.utils import timezone; "
        "from beauty_api.models import BeautyBooking, BeautyUser, BeautyService; "
        f"cust=BeautyUser.objects.get(id={target_id}); "
        f"svc=BeautyService.objects.get(id={svc_id}); "
        "b=BeautyBooking.objects.create(customer=cust, service=svc, "
        "slot_at=timezone.now(), status='booked', "
        "service_name_at_booking='Test Svc', "
        "service_price_dollars_at_booking=50, "
        "service_duration_minutes_at_booking=30); print(b.id)"
    ))
    _STATE.update({
        "admin_email": admin_email, "target_email": target_email,
        "principal_id": principal_id, "target_id": target_id,
        "bp_id": bp_id, "prov_id": prov_id, "svc_id": svc_id,
        "booking_id": booking_id,
    })
    yield _STATE

    # Teardown: booking cascades chat messages; delete audit events + principal + users.
    bid = _STATE.get("booking_id")
    if bid:
        _shell(
            f"from beauty_api.models import BeautyBooking; "
            f"BeautyBooking.objects.filter(id={bid}).delete(); print('ok')"
        )
    _shell(
        "from beauty_api.models import BeautyAdminAuditEvent; "
        f"BeautyAdminAuditEvent.objects.filter(action='message.send', target_type='customer', "
        f"target_id='{target_id}').delete(); print('ok')"
    )
    _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')"
    )
    _shell(
        "from beauty_api.models import BeautyService, BeautyProvider, BusinessProvider; "
        f"BeautyService.objects.filter(id={svc_id}).delete(); "
        f"BeautyProvider.objects.filter(id={prov_id}).delete(); "
        f"BusinessProvider.objects.filter(id={bp_id}).delete(); print('ok')"
    )
    delete_test_users(admin_email)
    delete_test_users(target_email)


# ─────────────────────────────────────────────────────────────────────────────
# Provider fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="function")
def admin_on_provider_no_booking(page):
    """Admin + a target BusinessProvider with NO booking (gate should be closed)."""
    tag = uuid.uuid4().hex[:6]
    admin_email = f"msgpadm_{tag}@beauty-test.com"
    password = "MsgPass123!"

    principal_id = _seed_admin_session(page, admin_email, password)

    bp_id = int(_shell(
        "from beauty_api.models import BusinessProvider; "
        f"bp=BusinessProvider.objects.create(email='msgbp0_{tag}@beauty-test.com', "
        f"password='x', business_name='NoThread Studio {tag}'); print(bp.id)"
    ))
    _STATE.update({
        "admin_email": admin_email, "principal_id": principal_id,
        "bp_id": bp_id, "booking_id": None,
    })
    yield _STATE

    _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')"
    )
    _shell(
        "from beauty_api.models import BusinessProvider; "
        f"BusinessProvider.objects.filter(id={bp_id}).delete(); print('ok')"
    )
    delete_test_users(admin_email)


@pytest.fixture(scope="function")
def admin_on_provider_with_booking(page):
    """Admin + BusinessProvider + BeautyProvider + BeautyService + messageable booking."""
    tag = uuid.uuid4().hex[:6]
    admin_email = f"msgpadm_{tag}@beauty-test.com"
    cust_email = f"msgpcust_{tag}@beauty-test.com"
    password = "MsgPass123!"

    principal_id = _seed_admin_session(page, admin_email, password)

    # Seed the customer who books the service (BeautyBooking.customer)
    assert requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": cust_email, "password": password}, timeout=10,
    ).status_code == 201
    cust_id = int(_shell(
        "from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(email='{cust_email}').id)"
    ))

    # The target: BusinessProvider → BeautyProvider(business_provider_id=bp.id)
    # chat_service.find_messageable_booking('business', bp.id) filters:
    #   service__provider__business_provider_id = bp.id
    bp_id = int(_shell(
        "from beauty_api.models import BusinessProvider; "
        f"bp=BusinessProvider.objects.create(email='msgbp_{tag}@beauty-test.com', "
        f"password='x', business_name='Msg Prov {tag}'); print(bp.id)"
    ))
    prov_id = int(_shell(
        "from beauty_api.models import BeautyProvider; "
        f"p=BeautyProvider.objects.create(name='Msg Prov {tag}', "
        f"business_provider_id={bp_id}); print(p.id)"
    ))
    svc_id = int(_shell(
        "from beauty_api.models import BeautyService, BeautyProvider; "
        f"p=BeautyProvider.objects.get(id={prov_id}); "
        "s=BeautyService.objects.create(provider=p, name='Prov Test Svc', "
        "category='massage', duration_minutes=60, price_cents=8000); print(s.id)"
    ))
    booking_id = int(_shell(
        "from django.utils import timezone; "
        "from beauty_api.models import BeautyBooking, BeautyUser, BeautyService; "
        f"cust=BeautyUser.objects.get(id={cust_id}); "
        f"svc=BeautyService.objects.get(id={svc_id}); "
        "b=BeautyBooking.objects.create(customer=cust, service=svc, "
        "slot_at=timezone.now(), status='booked', "
        "service_name_at_booking='Prov Test Svc', "
        "service_price_dollars_at_booking=80, "
        "service_duration_minutes_at_booking=60); print(b.id)"
    ))
    _STATE.update({
        "admin_email": admin_email, "cust_email": cust_email,
        "principal_id": principal_id, "cust_id": cust_id,
        "bp_id": bp_id, "prov_id": prov_id, "svc_id": svc_id,
        "booking_id": booking_id,
    })
    yield _STATE

    bid = _STATE.get("booking_id")
    if bid:
        _shell(
            f"from beauty_api.models import BeautyBooking; "
            f"BeautyBooking.objects.filter(id={bid}).delete(); print('ok')"
        )
    _shell(
        "from beauty_api.models import BeautyAdminAuditEvent; "
        f"BeautyAdminAuditEvent.objects.filter(action='message.send', target_type='business', "
        f"target_id='{bp_id}').delete(); print('ok')"
    )
    _shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')"
    )
    _shell(
        "from beauty_api.models import BeautyService, BeautyProvider, BusinessProvider; "
        f"BeautyService.objects.filter(id={svc_id}).delete(); "
        f"BeautyProvider.objects.filter(id={prov_id}).delete(); "
        f"BusinessProvider.objects.filter(id={bp_id}).delete(); print('ok')"
    )
    delete_test_users(admin_email)
    delete_test_users(cust_email)


# ─────────────────────────────────────────────────────────────────────────────
# Customer: gate-closed scenario
# ─────────────────────────────────────────────────────────────────────────────

@given("I am signed in as a Beauty admin viewing a customer with no messageable booking")
def open_customer_no_booking(page, admin_on_customer_no_booking):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_customer_detail", id=_STATE["target_id"])
    expect(page.locator(cd_root)).to_be_visible(timeout=15000)


@then("the customer In-app message button should be disabled")
def customer_msg_btn_disabled(page):
    btn = page.locator(cd_msg_btn)
    expect(btn).to_be_visible(timeout=10000)
    expect(btn).to_be_disabled()


# ─────────────────────────────────────────────────────────────────────────────
# Customer: full send scenario
# ─────────────────────────────────────────────────────────────────────────────

@given("I am signed in as a Beauty admin viewing a customer with a messageable booking")
def open_customer_with_booking(page, admin_on_customer_with_booking):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_customer_detail", id=_STATE["target_id"])
    expect(page.locator(cd_root)).to_be_visible(timeout=15000)


@when("I click the customer In-app message button")
def click_customer_msg_btn(page):
    btn = page.locator(cd_msg_btn)
    expect(btn).to_be_enabled(timeout=10000)
    btn.click()


@then("the customer message composer should be visible")
def customer_composer_visible(page):
    expect(page.locator(cd_msg_composer)).to_be_visible(timeout=8000)


@when("I type a message body into the customer composer")
def type_customer_msg(page):
    _STATE["msg_body"] = f"E2E admin msg {uuid.uuid4().hex[:8]}"
    page.locator(cd_msg_ta).fill(_STATE["msg_body"])


@when("I click the customer composer send button")
def click_customer_send(page):
    send_btn = page.locator(cd_msg_send)
    expect(send_btn).to_be_enabled(timeout=5000)
    send_btn.click()


@then("the customer message send should succeed")
def customer_send_succeeds(page):
    # Shell wires: success → messageResult(true) → shows [role="status"] "Sent."
    expect(page.locator(cd_msg_sent, has_text="Sent.")).to_be_visible(timeout=10000)


@then("a BeautyChatMessage with sender_type admin should exist on the customer booking")
def customer_msg_in_db(page):
    body = _STATE["msg_body"]
    bid = _STATE["booking_id"]
    for _ in range(30):
        n = int(_shell(
            "from beauty_api.models import BeautyChatMessage; "
            f"print(BeautyChatMessage.objects.filter(booking_id={bid}, "
            f"sender_type='admin', body='{body}').count())"
        ))
        if n >= 1:
            return
        page.wait_for_timeout(200)
    raise AssertionError(
        f"BeautyChatMessage(sender_type='admin', body='{body}') not found on booking {bid}."
    )


@then("a message.send audit event should exist for the customer target")
def customer_audit_event(page):
    tid = _STATE["target_id"]
    for _ in range(20):
        n = int(_shell(
            "from beauty_api.models import BeautyAdminAuditEvent; "
            f"print(BeautyAdminAuditEvent.objects.filter(action='message.send', "
            f"target_type='customer', target_id='{tid}').count())"
        ))
        if n >= 1:
            return
        page.wait_for_timeout(200)
    raise AssertionError(
        f"No message.send audit event for customer target_id={tid}."
    )


# ─────────────────────────────────────────────────────────────────────────────
# Provider: gate-closed scenario
# ─────────────────────────────────────────────────────────────────────────────

@given("I am signed in as a Beauty admin viewing a provider with no messageable booking")
def open_provider_no_booking(page, admin_on_provider_no_booking):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_provider_detail", id=_STATE["bp_id"])
    expect(page.locator(pd_root)).to_be_visible(timeout=15000)


@then("the provider In-app message button should be disabled")
def provider_msg_btn_disabled(page):
    btn = page.locator(pd_msg_btn)
    expect(btn).to_be_visible(timeout=10000)
    expect(btn).to_be_disabled()


# ─────────────────────────────────────────────────────────────────────────────
# Provider: full send scenario
# ─────────────────────────────────────────────────────────────────────────────

@given("I am signed in as a Beauty admin viewing a provider with a messageable booking")
def open_provider_with_booking(page, admin_on_provider_with_booking):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_provider_detail", id=_STATE["bp_id"])
    expect(page.locator(pd_root)).to_be_visible(timeout=15000)


@when("I click the provider In-app message button")
def click_provider_msg_btn(page):
    btn = page.locator(pd_msg_btn)
    expect(btn).to_be_enabled(timeout=10000)
    btn.click()


@then("the provider message composer should be visible")
def provider_composer_visible(page):
    expect(page.locator(pd_msg_composer)).to_be_visible(timeout=8000)


@when("I type a message body into the provider composer")
def type_provider_msg(page):
    _STATE["msg_body"] = f"E2E admin prov msg {uuid.uuid4().hex[:8]}"
    page.locator(pd_msg_ta).fill(_STATE["msg_body"])


@when("I click the provider composer send button")
def click_provider_send(page):
    send_btn = page.locator(pd_msg_send)
    expect(send_btn).to_be_enabled(timeout=5000)
    send_btn.click()


@then("the provider message send should succeed")
def provider_send_succeeds(page):
    expect(page.locator(pd_msg_sent, has_text="Sent.")).to_be_visible(timeout=10000)


@then("a BeautyChatMessage with sender_type admin should exist on the provider booking")
def provider_msg_in_db(page):
    body = _STATE["msg_body"]
    bid = _STATE["booking_id"]
    for _ in range(30):
        n = int(_shell(
            "from beauty_api.models import BeautyChatMessage; "
            f"print(BeautyChatMessage.objects.filter(booking_id={bid}, "
            f"sender_type='admin', body='{body}').count())"
        ))
        if n >= 1:
            return
        page.wait_for_timeout(200)
    raise AssertionError(
        f"BeautyChatMessage(sender_type='admin', body='{body}') not found on booking {bid}."
    )


@then("a message.send audit event should exist for the provider target")
def provider_audit_event(page):
    bp_id = _STATE["bp_id"]
    for _ in range(20):
        n = int(_shell(
            "from beauty_api.models import BeautyAdminAuditEvent; "
            f"print(BeautyAdminAuditEvent.objects.filter(action='message.send', "
            f"target_type='business', target_id='{bp_id}').count())"
        ))
        if n >= 1:
            return
        page.wait_for_timeout(200)
    raise AssertionError(
        f"No message.send audit event for provider (business) target_id={bp_id}."
    )
