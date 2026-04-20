import uuid
import requests
import pytest
from pytest_bdd import given

from .beauty_utils import BACKEND_URL, TEST_DEVICE_ID, delete_test_users


@pytest.fixture(scope="function")
def test_customer():
    email = f"test_customer_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "TestPass123!"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": email, "password": password},
        timeout=10,
    )
    assert resp.status_code == 201, (
        f"Setup: failed to create test customer: {resp.text}"
    )
    yield {"email": email, "password": password}
    delete_test_users(email)


@pytest.fixture(scope="function")
def test_business():
    email = f"test_business_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "TestPass123!"
    business_name = "Test Beauty Studio"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={"email": email, "password": password, "business_name": business_name},
        timeout=10,
    )
    assert resp.status_code == 201, (
        f"Setup: failed to create test business provider: {resp.text}"
    )
    yield {"email": email, "password": password, "business_name": business_name}
    delete_test_users(email)


@given("the beauty API is reachable")
def beauty_api_is_reachable():
    resp = requests.get(f"{BACKEND_URL}/api/beauty/signup/", timeout=5)
    assert resp.status_code in (200, 405, 429), (
        f"Beauty API appears unreachable. Status: {resp.status_code}"
    )
