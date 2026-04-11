import uuid
import requests
from pytest_bdd import scenarios, given, when, then, parsers

from .beauty_utils import BACKEND_URL, delete_test_users

scenarios("../../features/Pogoda/Beauty/beauty_api_signup.feature")

_signup_state = {}


@when("I POST valid customer signup data to the signup endpoint")
def post_valid_customer_signup():
    email = f"test_apisu_{uuid.uuid4().hex[:8]}@beauty-test.com"
    _signup_state["new_customer_email"] = email
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": email, "password": "TestPass123!"},
        timeout=10,
    )
    _signup_state["signup_response"] = resp


@then("the signup response status should be 201")
def verify_signup_status_201():
    resp = _signup_state["signup_response"]
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
    delete_test_users(_signup_state.get("new_customer_email", ""))


@then('the signup response should contain the message "Account created successfully."')
def verify_signup_success_message():
    body = _signup_state["signup_response"].json()
    assert body.get("message") == "Account created successfully.", (
        f"Unexpected message: {body}"
    )


@then("the signup response should contain the registered email")
def verify_signup_email_in_response():
    body = _signup_state["signup_response"].json()
    expected = _signup_state["new_customer_email"]
    assert body.get("email") == expected, (
        f"Expected email {expected}, got {body.get('email')}"
    )


@given("a test customer account exists for duplicate check", target_fixture="dup_customer")
def customer_for_dup_check(test_customer):
    return test_customer


@when("I POST the same customer email to the signup endpoint again")
def post_duplicate_customer_email(dup_customer):
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": dup_customer["email"], "password": "AnotherPass1!"},
        timeout=10,
    )
    _signup_state["signup_response"] = resp


@then("the signup response status should be 400")
def verify_signup_status_400():
    resp = _signup_state["signup_response"]
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"


@then("the signup response should indicate the email already exists")
def verify_duplicate_email_error():
    body = _signup_state["signup_response"].json()
    email_errors = body.get("email", [])
    assert any("already exists" in str(e) for e in email_errors), (
        f"Expected duplicate email error, got: {body}"
    )


@when("I POST customer signup data with a password shorter than 8 characters")
def post_short_password_signup():
    email = f"test_shortpw_{uuid.uuid4().hex[:8]}@beauty-test.com"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/signup/",
        json={"email": email, "password": "short"},
        timeout=10,
    )
    _signup_state["signup_response"] = resp


@when("I POST valid business provider signup data to the business signup endpoint")
def post_valid_business_signup():
    email = f"test_biz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    _signup_state["new_business_email"] = email
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={
            "email": email,
            "password": "TestPass123!",
            "business_name": "Test Studio",
        },
        timeout=10,
    )
    _signup_state["business_signup_response"] = resp


@then("the business signup response status should be 201")
def verify_business_signup_201():
    resp = _signup_state["business_signup_response"]
    assert resp.status_code == 201, (
        f"Expected 201, got {resp.status_code}: {resp.text}"
    )
    delete_test_users(_signup_state.get("new_business_email", ""))


@then(parsers.parse('the business signup response should contain "{message}"'))
def verify_business_signup_message(message):
    body = _signup_state["business_signup_response"].json()
    assert body.get("message") == message, f"Unexpected message: {body}"


@when("I POST business provider signup data without a business name")
def post_business_signup_without_name():
    email = f"test_nobiz_{uuid.uuid4().hex[:8]}@beauty-test.com"
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/business/signup/",
        json={"email": email, "password": "TestPass123!", "business_name": ""},
        timeout=10,
    )
    _signup_state["business_signup_response"] = resp


@then("the business signup response status should be 400")
def verify_business_signup_400():
    resp = _signup_state["business_signup_response"]
    assert resp.status_code == 400, (
        f"Expected 400, got {resp.status_code}: {resp.text}"
    )
