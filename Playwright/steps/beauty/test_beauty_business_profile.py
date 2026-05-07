import os
import re
import subprocess
import uuid
import pytest
import requests
from pytest_bdd import scenarios, given, when, then
from playwright.sync_api import expect

from Playwright.Hooks.hooks import goto_route, timeout_for_testing
from Playwright.pages.pogoda.beauty.business_home_page import home_root, profile_button
from Playwright.pages.pogoda.beauty.business_profile_page import (
    earnings_total,
    earnings_count,
)
from .beauty_utils import (
    BACKEND_URL,
    accept_application_via_api,
    attach_business_session_cookie,
    delete_test_users,
    login_business_via_api,
)

scenarios("../../features/Pogoda/Beauty/beauty_business_profile.feature")

_MANAGE_PY_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "Backend", "controller"
)

# Seed a single 50.00 USD booking so totals are deterministic.
BOOKING_PRICE_CENTS = 5000


def _seed_booking(email: str) -> None:
    cmd = (
        "from datetime import datetime, timedelta, timezone; "
        "from beauty_api.models import (BeautyUser, BeautyBooking, BeautyService, BusinessProvider); "
        "from beauty_api.availability_service import ensure_storefront; "
        f"bp = BusinessProvider.objects.get(email='{email}'); "
        "store = ensure_storefront(bp); "
        "svc, _ = BeautyService.objects.get_or_create(provider=store, name='Manicure', "
        f"defaults={{'category':'nails','price_cents':{BOOKING_PRICE_CENTS},'duration_minutes':60}}); "
        "user, _ = BeautyUser.objects.get_or_create(email='profile_cust@test.com', "
        "defaults={'password':'!'}); "
        "now = datetime.now(timezone.utc); "
        "BeautyBooking.objects.create(customer=user, service=svc, slot_at=now + timedelta(hours=2), "
        "status='booked', service_name_at_booking=svc.name, "
        f"service_price_cents_at_booking={BOOKING_PRICE_CENTS}, "
        "service_duration_minutes_at_booking=60)"
    )
    subprocess.run(
        ["python", "manage.py", "shell", "-c", cmd],
        cwd=os.path.abspath(_MANAGE_PY_DIR),
        capture_output=True,
        timeout=30,
    )


@pytest.fixture(scope="function")
def business_with_paid_booking():
    email = f"prof_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "ProfPass123!"
    name = "Profile Studio"
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


@given("I am signed in as an accepted business with a paid booking")
def signed_in(page, business_with_paid_booking):
    cookie = login_business_via_api(
        business_with_paid_booking["email"], business_with_paid_booking["password"]
    )
    attach_business_session_cookie(page, cookie)


@when("I open the business home page")
def open_home(page):
    goto_route(page, "beauty_business_home")
    timeout_for_testing(page)
    expect(page.locator(home_root)).to_be_visible()


@when("I click the business profile button")
def click_profile(page):
    page.locator(profile_button).click()
    page.wait_for_url("**/business/profile", timeout=10_000)


@then("the business profile page should render")
def profile_render(page):
    expect(page.locator(earnings_total)).to_be_visible()


@then("the lifetime earnings value should be visible")
def lifetime_visible(page):
    expect(page.locator(earnings_total)).to_be_visible()


@then("the lifetime earnings should reflect the paid booking")
def lifetime_value(page):
    text = page.locator(earnings_total).inner_text()
    # Match "$50.00" formatting from Intl.NumberFormat.
    assert re.search(r"\$\s*50\.00", text), f"Unexpected total: {text!r}"
    expect(page.locator(earnings_count)).to_contain_text("1")
