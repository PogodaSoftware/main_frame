import requests
from pytest_bdd import scenarios, given, when, then

from .beauty_utils import BACKEND_URL, TEST_DEVICE_ID

scenarios("../../features/Pogoda/Beauty/beauty_api_session.feature")

_session_state = {}


def _do_login(customer: dict) -> requests.Response:
    return requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={
            "email": customer["email"],
            "password": customer["password"],
            "device_id": TEST_DEVICE_ID,
        },
        timeout=10,
    )


@given("a test customer is logged in via API", target_fixture="logged_in_customer")
def customer_logged_in(test_customer):
    resp = _do_login(test_customer)
    assert resp.status_code == 200, f"Login setup failed: {resp.text}"
    assert "beauty_auth" in resp.cookies, "beauty_auth cookie not set after login"
    _session_state["auth_cookie"] = resp.cookies["beauty_auth"]
    _session_state["customer_email"] = test_customer["email"]
    return test_customer


@when("I GET the protected me endpoint with the auth cookie and correct device ID")
def get_me_with_valid_cookie():
    resp = requests.get(
        f"{BACKEND_URL}/api/beauty/protected/me/",
        cookies={"beauty_auth": _session_state["auth_cookie"]},
        headers={"X-Device-ID": TEST_DEVICE_ID},
        timeout=10,
    )
    _session_state["me_response"] = resp


@then("the me endpoint response status should be 200")
def verify_me_status_200():
    resp = _session_state["me_response"]
    assert resp.status_code == 200, (
        f"Expected 200, got {resp.status_code}: {resp.text}"
    )


@then('the me endpoint response user type should be "customer"')
def verify_me_user_type():
    body = _session_state["me_response"].json()
    assert body.get("user_type") == "customer", (
        f"Expected user_type 'customer', got: {body}"
    )


@then("the me endpoint response email should match the test customer email")
def verify_me_email():
    body = _session_state["me_response"].json()
    expected = _session_state["customer_email"]
    assert body.get("email") == expected, (
        f"Expected email {expected}, got {body.get('email')}"
    )


@when("I GET the protected me endpoint without any cookie")
def get_me_without_cookie():
    resp = requests.get(
        f"{BACKEND_URL}/api/beauty/protected/me/",
        headers={"X-Device-ID": TEST_DEVICE_ID},
        timeout=10,
    )
    _session_state["me_response"] = resp


@then("the me endpoint response status should be 401")
def verify_me_status_401():
    resp = _session_state["me_response"]
    assert resp.status_code == 401, (
        f"Expected 401, got {resp.status_code}: {resp.text}"
    )


@when("I GET the protected me endpoint with the auth cookie but wrong device ID")
def get_me_with_wrong_device():
    resp = requests.get(
        f"{BACKEND_URL}/api/beauty/protected/me/",
        cookies={"beauty_auth": _session_state["auth_cookie"]},
        headers={"X-Device-ID": "wrong-device-id-xyz"},
        timeout=10,
    )
    _session_state["me_response"] = resp


@when("I POST to the logout endpoint with the auth cookie")
def post_logout_with_cookie():
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/logout/",
        cookies={"beauty_auth": _session_state["auth_cookie"]},
        headers={"X-Device-ID": TEST_DEVICE_ID},
        timeout=10,
    )
    _session_state["logout_response"] = resp


@then("the logout response status should be 200")
def verify_logout_200():
    resp = _session_state["logout_response"]
    assert resp.status_code == 200, (
        f"Expected 200, got {resp.status_code}: {resp.text}"
    )


@then('the logout response should contain the message "Logged out successfully."')
def verify_logout_message():
    body = _session_state["logout_response"].json()
    assert body.get("message") == "Logged out successfully.", (
        f"Unexpected message: {body}"
    )


@then("subsequent GET to protected me endpoint should return 401")
def verify_me_after_logout():
    resp = requests.get(
        f"{BACKEND_URL}/api/beauty/protected/me/",
        cookies={"beauty_auth": _session_state["auth_cookie"]},
        headers={"X-Device-ID": TEST_DEVICE_ID},
        timeout=10,
    )
    assert resp.status_code == 401, (
        f"Expected 401 after logout, got {resp.status_code}: {resp.text}"
    )
