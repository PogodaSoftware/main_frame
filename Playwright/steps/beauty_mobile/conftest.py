"""Pytest config for the RN Beauty web port.

Mirrors ``Playwright/steps/beauty/conftest.py`` — reuses the same
``test_customer`` / ``test_business`` signup fixtures since the backend is
shared between Angular and RN builds.
"""

import os
import uuid

import pytest
import requests

from Playwright.steps.beauty.beauty_utils import BACKEND_URL, delete_test_users


def _mobile_base() -> str:
    host = os.getenv("BEAUTY_MOBILE_HOST", "localhost")
    port = os.getenv("BEAUTY_MOBILE_PORT", "8081")
    return f"http://{host}:{port}"


@pytest.fixture(scope="session", autouse=True)
def _require_mobile_dev_server():
    """Skip the whole mobile suite if the RN web bundle is not running.

    The bundle is the Expo Router web build served by ``bunx expo start --web``.
    Keeping this check at session scope means a missing dev server skips
    every test once instead of producing 30+ timeouts.
    """
    try:
        requests.get(_mobile_base(), timeout=2)
    except Exception:
        pytest.skip(
            f"RN web bundle unreachable at {_mobile_base()}. "
            "Start it with `cd Frontend/beautyAppMobile && bunx expo start --web`."
        )


@pytest.fixture(scope="function")
def test_customer():
    email = f"test_customer_mobile_{uuid.uuid4().hex[:8]}@beauty-test.com"
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
    email = f"test_business_mobile_{uuid.uuid4().hex[:8]}@beauty-test.com"
    password = "TestPass123!"
    business_name = "RN Mobile Test Studio"
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
