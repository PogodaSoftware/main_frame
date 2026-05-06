import os
import subprocess
from typing import Iterable

import requests

BACKEND_PORT = os.getenv('BACKEND_PORT', '8000')
BACKEND_URL = f"http://localhost:{BACKEND_PORT}"
TEST_DEVICE_ID = "test-device-playwright-beauty-001"
BEAUTY_SESSION_COOKIE = "beauty_session"

_MANAGE_PY_DIR = os.path.join(
    os.path.dirname(__file__), '..', '..', '..', 'Backend', 'controller'
)


def delete_test_users(email: str) -> None:
    cmd = (
        "from beauty_api.models import BeautyUser, BusinessProvider; "
        f"BeautyUser.objects.filter(email='{email}').delete(); "
        f"BusinessProvider.objects.filter(email='{email}').delete()"
    )
    subprocess.run(
        ["python", "manage.py", "shell", "-c", cmd],
        cwd=os.path.abspath(_MANAGE_PY_DIR),
        capture_output=True,
        timeout=30,
    )


def login_business_via_api(email: str, password: str) -> str:
    """Sign in a business provider via the REST endpoint and return the
    raw session cookie value so a Playwright test can attach it to the
    browser before navigating to a gated screen."""
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/login/",
        json={"email": email, "password": password, "device_id": TEST_DEVICE_ID},
        timeout=10,
    )
    assert resp.status_code == 200, f"Business login failed: {resp.text}"
    cookie = resp.cookies.get(BEAUTY_SESSION_COOKIE)
    assert cookie, "Business login response missing beauty_session cookie."
    return cookie


def attach_business_session_cookie(page, cookie_value: str) -> None:
    """Set the auth cookie on the Playwright browser context for both the
    backend and frontend ports so subsequent navigations include it."""
    frontend_ports: Iterable[str] = {os.getenv('BEAUTY_PORT', '4200'),
                                     os.getenv('FRONTEND_PORT', '5000')}
    cookies = []
    for port in frontend_ports:
        cookies.append({
            "name": BEAUTY_SESSION_COOKIE,
            "value": cookie_value,
            "domain": "localhost",
            "path": "/",
            "httpOnly": False,
        })
    page.context.add_cookies(cookies)


def accept_application_via_api(email: str) -> None:
    """Auto-accept a business's application by writing all required fields
    via the Django shell. Used to skip the wizard during home-page tests."""
    cmd = (
        "from datetime import datetime, timezone; "
        "from beauty_api.models import BusinessProvider, BusinessProviderApplication; "
        f"bp = BusinessProvider.objects.get(email='{email}'); "
        "app, _ = BusinessProviderApplication.objects.get_or_create(business_provider=bp); "
        "app.entity_type = 'person'; "
        "app.applicant_first_name = 'Pat'; "
        "app.applicant_last_name = 'Owner'; "
        "app.business_name = bp.business_name; "
        "app.selected_categories = ['nails']; "
        "app.completed_steps = ['entity','services','stripe','schedule','tools']; "
        "app.tos_accepted_at = datetime.now(timezone.utc); "
        "app.submitted_at = datetime.now(timezone.utc); "
        "app.accepted_at = datetime.now(timezone.utc); "
        "app.status = 'accepted'; "
        "app.save()"
    )
    subprocess.run(
        ["python", "manage.py", "shell", "-c", cmd],
        cwd=os.path.abspath(_MANAGE_PY_DIR),
        capture_output=True,
        timeout=30,
    )
