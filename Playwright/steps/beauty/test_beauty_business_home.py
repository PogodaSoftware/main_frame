import os
import subprocess
import uuid
import pytest
import requests
from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import goto_route, timeout_for_testing
from Playwright.pages.pogoda.beauty.business_home_page import (
    home_root,
    calendar_grid,
    today_cell,
    gauge_earnings_value,
    gauge_volume_value,
)
from .beauty_utils import (
    BACKEND_URL,
    accept_application_via_api,
    attach_business_session_cookie,
    delete_test_users,
    login_business_via_api,
)

scenarios("../../features/Pogoda/Beauty/beauty_business_home.feature")

_MANAGE_PY_DIR = os.path.join(
    os.path.dirname(__file__), '..', '..', '..', 'Backend', 'controller'
)


def _seed_booking(email: str) -> None:
    cmd = (
        "from datetime import datetime, timedelta, timezone; "
        "from beauty_api.models import (BeautyUser, BeautyBooking, BeautyService, "
        "BeautyProvider, BusinessProvider); "
        "from beauty_api.availability_service import ensure_storefront; "
        f"bp = BusinessProvider.objects.get(email='{email}'); "
        "store = ensure_storefront(bp); "
        "svc, _ = BeautyService.objects.get_or_create(provider=store, name='Manicure', "
        "defaults={'category':'nails','price_cents':5000,'duration_minutes':60}); "
        "user, _ = BeautyUser.objects.get_or_create(email='cust@test.com', "
        "defaults={'password':'!'}); "
        "now = datetime.now(timezone.utc); "
        "BeautyBooking.objects.create(customer=user, service=svc, slot_at=now + timedelta(hours=2), "
        "status='booked', service_name_at_booking=svc.name, "
        "service_price_cents_at_booking=svc.price_cents, "
        "service_duration_minutes_at_booking=svc.duration_minutes)"
    )
    subprocess.run(
        ["python", "manage.py", "shell", "-c", cmd],
        cwd=os.path.abspath(_MANAGE_PY_DIR),
        capture_output=True,
        timeout=30,
    )


@pytest.fixture(scope="function")
def accepted_business_with_booking():
    email = f"home_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "HomePass123!"
    name = "Home Studio"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={"email": email, "password": password, "business_name": name},
        timeout=10,
    )
    assert resp.status_code == 201, f"Setup failed: {resp.text}"
    accept_application_via_api(email)
    _seed_booking(email)
    yield {"email": email, "password": password, "business_name": name}
    delete_test_users(email)


@given("I am signed in as an accepted business with a known booking today")
def signed_in(page, accepted_business_with_booking):
    cookie = login_business_via_api(
        accepted_business_with_booking["email"],
        accepted_business_with_booking["password"],
    )
    attach_business_session_cookie(page, cookie)


@when("I open the business home page")
def open_home(page):
    goto_route(page, 'beauty_business_home')
    timeout_for_testing(page)
    expect(page.locator(home_root)).to_be_visible()


@then("the business home calendar should render")
def calendar_render(page):
    expect(page.locator(calendar_grid)).to_be_visible()


@then("today's calendar cell should be highlighted")
def today_highlight(page):
    expect(page.locator(today_cell)).to_be_visible()


@then("the earnings gauge value should be visible")
def earnings_visible(page):
    expect(page.locator(gauge_earnings_value)).to_be_visible()


@then("the bookings volume gauge value should be visible")
def volume_visible(page):
    expect(page.locator(gauge_volume_value)).to_be_visible()
