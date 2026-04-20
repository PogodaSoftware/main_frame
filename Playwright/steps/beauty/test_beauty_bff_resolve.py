import requests
from pytest_bdd import scenarios, given, when, then, parsers

from .beauty_utils import BACKEND_URL, TEST_DEVICE_ID

scenarios("../../features/Pogoda/Beauty/beauty_bff_resolve.feature")

_bff_state = {}

BFF_URL = f"{BACKEND_URL}/api/bff/beauty/resolve/"


def _post_bff(screen: str, cookie: str = None, device_id: str = TEST_DEVICE_ID) -> requests.Response:
    cookies = {"beauty_auth": cookie} if cookie else {}
    return requests.post(
        BFF_URL,
        json={"version": "1.0.0", "screen": screen, "device_id": device_id},
        cookies=cookies,
        timeout=10,
    )


@given("a test customer is logged in via API for BFF test", target_fixture="bff_logged_in_customer")
def bff_customer_logged_in(test_customer):
    resp = requests.post(
        f"{BACKEND_URL}/api/beauty/login/",
        json={
            "email": test_customer["email"],
            "password": test_customer["password"],
            "device_id": TEST_DEVICE_ID,
        },
        timeout=10,
    )
    assert resp.status_code == 200, f"BFF test login setup failed: {resp.text}"
    assert "beauty_auth" in resp.cookies, "beauty_auth cookie missing after login"
    _bff_state["auth_cookie"] = resp.cookies["beauty_auth"]
    return test_customer


@when(parsers.parse('I POST to the BFF resolve endpoint with screen "{screen}" and no cookie'))
def bff_post_no_cookie(screen):
    _bff_state["bff_response"] = _post_bff(screen)
    _bff_state["screen"] = screen


@when("I POST to the BFF resolve endpoint with an unknown screen name")
def bff_post_unknown_screen():
    _bff_state["bff_response"] = _post_bff("totally_unknown_screen")


@when("I POST to the BFF resolve endpoint without a device_id")
def bff_post_no_device_id():
    resp = requests.post(
        BFF_URL,
        json={"version": "1.0.0", "screen": "beauty_home", "device_id": ""},
        timeout=10,
    )
    _bff_state["bff_response"] = resp


@then(parsers.parse("the BFF response status should be {status_code:d}"))
def verify_bff_status(status_code):
    resp = _bff_state["bff_response"]
    assert resp.status_code == status_code, (
        f"Expected {status_code}, got {resp.status_code}: {resp.text}"
    )


@then(parsers.parse('the BFF response action should be "{action}"'))
def verify_bff_action(action):
    body = _bff_state["bff_response"].json()
    assert body.get("action") == action, (
        f"Expected action '{action}', got: {body.get('action')}"
    )


@then(parsers.parse('the BFF response screen should be "{screen}"'))
def verify_bff_screen(screen):
    body = _bff_state["bff_response"].json()
    assert body.get("screen") == screen, (
        f"Expected screen '{screen}', got: {body.get('screen')}"
    )


@then("the BFF response data should show is_authenticated as false")
def verify_bff_not_authenticated():
    body = _bff_state["bff_response"].json()
    data = body.get("data", {})
    assert data.get("is_authenticated") is False, (
        f"Expected is_authenticated=False, got: {data}"
    )


@then("the BFF response data should show is_authenticated as true")
def verify_bff_authenticated():
    body = _bff_state["bff_response"].json()
    data = body.get("data", {})
    assert data.get("is_authenticated") is True, (
        f"Expected is_authenticated=True, got: {data}"
    )


@then(parsers.parse('the BFF redirect target should be "{target}"'))
def verify_bff_redirect_target(target):
    body = _bff_state["bff_response"].json()
    assert body.get("redirect_to") == target, (
        f"Expected redirect_to '{target}', got: {body.get('redirect_to')}"
    )


@when(parsers.parse('I POST to the BFF resolve endpoint with screen "{screen}" and auth cookie'))
def bff_post_with_cookie(screen):
    _bff_state["bff_response"] = _post_bff(screen, cookie=_bff_state["auth_cookie"])
