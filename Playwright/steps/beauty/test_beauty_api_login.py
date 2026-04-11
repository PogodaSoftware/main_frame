import requests
from pytest_bdd import scenarios, given, when, then

from .beauty_utils import BACKEND_URL, TEST_DEVICE_ID

scenarios("../../features/Pogoda/Beauty/beauty_api_login.feature")

_login_state = {}


@given("a test customer account exists for API login", target_fixture="api_login_customer")
def customer_for_api_login(test_customer):
    return test_customer


@when("I POST valid customer login credentials with a device ID")
def post_valid_customer_login(api_login_customer):
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={
            "email": api_login_customer["email"],
            "password": api_login_customer["password"],
            "device_id": TEST_DEVICE_ID,
        },
        timeout=10,
    )
    _login_state["customer_login_response"] = resp


@then("the customer login response status should be 200")
def verify_customer_login_200():
    resp = _login_state["customer_login_response"]
    assert resp.status_code == 200, (
        f"Expected 200, got {resp.status_code}: {resp.text}"
    )


@then('the customer login response should contain the message "Login successful."')
def verify_customer_login_message():
    body = _login_state["customer_login_response"].json()
    assert body.get("message") == "Login successful.", (
        f"Unexpected message: {body}"
    )


@then("the response should set the beauty_auth cookie")
def verify_beauty_auth_cookie_set():
    resp = _login_state["customer_login_response"]
    assert "beauty_auth" in resp.cookies, (
        f"Expected beauty_auth cookie, got cookies: {dict(resp.cookies)}"
    )


@given("a test customer account exists for wrong password check", target_fixture="wrong_pw_customer")
def customer_for_wrong_pw(test_customer):
    return test_customer


@when("I POST customer login credentials with the wrong password")
def post_wrong_password_login(wrong_pw_customer):
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={
            "email": wrong_pw_customer["email"],
            "password": "WrongPassword999!",
            "device_id": TEST_DEVICE_ID,
        },
        timeout=10,
    )
    _login_state["customer_login_response"] = resp


@then("the customer login response status should be 401")
def verify_customer_login_401():
    resp = _login_state["customer_login_response"]
    assert resp.status_code == 401, (
        f"Expected 401, got {resp.status_code}: {resp.text}"
    )


@given("a test customer account exists for missing device ID check", target_fixture="no_device_customer")
def customer_for_no_device(test_customer):
    return test_customer


@when("I POST customer login credentials without a device ID")
def post_login_without_device_id(no_device_customer):
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={
            "email": no_device_customer["email"],
            "password": no_device_customer["password"],
            "device_id": "",
        },
        timeout=10,
    )
    _login_state["customer_login_response"] = resp


@then("the customer login response status should be 400")
def verify_customer_login_400():
    resp = _login_state["customer_login_response"]
    assert resp.status_code == 400, (
        f"Expected 400, got {resp.status_code}: {resp.text}"
    )


@given("a test business account exists for API login", target_fixture="api_login_business")
def business_for_api_login(test_business):
    return test_business


@when("I POST valid business login credentials with a device ID")
def post_valid_business_login(api_login_business):
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/login/",
        json={
            "email": api_login_business["email"],
            "password": api_login_business["password"],
            "device_id": TEST_DEVICE_ID,
        },
        timeout=10,
    )
    _login_state["business_login_response"] = resp


@then("the business login response status should be 200")
def verify_business_login_200():
    resp = _login_state["business_login_response"]
    assert resp.status_code == 200, (
        f"Expected 200, got {resp.status_code}: {resp.text}"
    )


@then('the business login response should contain the message "Login successful."')
def verify_business_login_message():
    body = _login_state["business_login_response"].json()
    assert body.get("message") == "Login successful.", (
        f"Unexpected message: {body}"
    )


@then("the business login response should set the beauty_auth cookie")
def verify_business_auth_cookie_set():
    resp = _login_state["business_login_response"]
    assert "beauty_auth" in resp.cookies, (
        f"Expected beauty_auth cookie, got cookies: {dict(resp.cookies)}"
    )
