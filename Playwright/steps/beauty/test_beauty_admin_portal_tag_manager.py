"""End-to-end tests for the Beauty Admin Portal — Tag manager (desktop).

* Table       → row count equals the real BeautyAdminTag count (DB), no fixtures.
* Create      → typing a name + Create tag POSTs, persists a BeautyAdminTag row,
                writes a `tag.create` audit event, and the row appears in place
                (in-component refetch, no navigation / reload).
* Validation  → an empty name is blocked client-side (no extra row created).
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_tag_manager_page import (
    tm_create_btn,
    tm_error,
    tm_name_input,
    tm_root,
    tm_rows,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_portal_tag_manager.feature")

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


def _tag_count() -> int:
    return int(_shell("from beauty_api.models import BeautyAdminTag; print(BeautyAdminTag.objects.count())"))


@pytest.fixture(scope="function")
def admin_on_tags(page):
    tag = uuid.uuid4().hex[:6]
    email = f"tagtest_{tag}@beauty-test.com"
    password = "TagPass123!"
    resp = requests.post(f"{BACKEND_URL}/api/beauty/signup/",
                         json={"email": email, "password": password}, timeout=10)
    assert resp.status_code == 201, f"Signup failed: {resp.text}"

    user_id = int(_shell(
        "from beauty_api.models import BeautyUser; "
        f"print(BeautyUser.objects.get(email='{email}').id)"
    ))
    principal_id = int(_shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "p,_=BeautyAdminPrincipal.objects.update_or_create("
        f"user_type='customer', user_id={user_id}, defaults={{'role':'owner'}}); print(p.id)"
    ))
    login = requests.post(f"{BACKEND_URL}/api/beauty/login/",
                          json={"email": email, "password": password, "device_id": TEST_DEVICE_ID}, timeout=10)
    assert login.status_code == 200, f"Login failed: {login.text}"
    cookie = login.cookies.get(BEAUTY_SESSION_COOKIE)
    page.context.add_cookies([{
        "name": BEAUTY_SESSION_COOKIE, "value": cookie,
        "domain": "localhost", "path": "/", "httpOnly": False,
    }])
    page.add_init_script(f"window.localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');")
    _STATE.update({"email": email, "user_id": user_id, "principal_id": principal_id})
    yield _STATE

    # Clean up: drop the tag (+ its audit event) this test created, then the principal + user.
    new_label = _STATE.get("new_label")
    if new_label:
        _shell(
            "from beauty_api.models import BeautyAdminTag, BeautyAdminAuditEvent; "
            f"ids=list(BeautyAdminTag.objects.filter(label='{new_label}').values_list('id',flat=True)); "
            "BeautyAdminAuditEvent.objects.filter(action='tag.create', target_id__in=[str(i) for i in ids]).delete(); "
            f"BeautyAdminTag.objects.filter(label='{new_label}').delete(); print('ok')"
        )
    _shell("from beauty_api.models import BeautyAdminPrincipal; "
           f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')")
    delete_test_users(email)


@given("I am signed in as a Beauty admin viewing the tag manager")
def open_tags(page, admin_on_tags):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_tag_manager")
    expect(page.locator(tm_root)).to_be_visible(timeout=15000)
    page.wait_for_selector(tm_rows, timeout=10000)


@then("the table count should equal the real BeautyAdminTag row count")
def table_equals_real(page):
    expect(page.locator(tm_rows)).to_have_count(_tag_count())


@when("I type a new tag name and click Create tag")
def type_and_create(page):
    label = f"E2E {uuid.uuid4().hex[:6]}"
    _STATE["new_label"] = label
    _STATE["before"] = _tag_count()
    page.locator(tm_name_input).fill(label)
    page.locator(tm_create_btn).click()


@then("a BeautyAdminTag row for that name should exist")
def row_exists(page):
    label = _STATE["new_label"]
    # Poll the DB briefly for the async POST to land.
    for _ in range(20):
        n = int(_shell(
            "from beauty_api.models import BeautyAdminTag; "
            f"print(BeautyAdminTag.objects.filter(label='{label}').count())"
        ))
        if n == 1:
            return
        page.wait_for_timeout(250)
    raise AssertionError(f"No BeautyAdminTag row created for {label!r}")


@then('a "tag.create" audit event should be recorded')
def audit_recorded(page):
    label = _STATE["new_label"]
    n = int(_shell(
        "from beauty_api.models import BeautyAdminTag, BeautyAdminAuditEvent; "
        f"ids=[str(i) for i in BeautyAdminTag.objects.filter(label='{label}').values_list('id',flat=True)]; "
        "print(BeautyAdminAuditEvent.objects.filter(action='tag.create', target_id__in=ids).count())"
    ))
    assert n >= 1, "Expected a tag.create audit event."


@then("the new tag should appear in the table without a page reload")
def appears_in_place(page):
    expect(page.locator(tm_rows)).to_have_count(_STATE["before"] + 1, timeout=10000)
    expect(page.locator(tm_rows, has_text=_STATE["new_label"])).to_have_count(1)


@when("I clear the name and click Create tag")
def clear_and_create(page):
    _STATE["before"] = _tag_count()
    page.locator(tm_name_input).fill("")
    page.locator(tm_create_btn).click()


@then("a tag-name validation error should show")
def validation_shows(page):
    expect(page.locator(tm_error)).to_be_visible()


@then("no extra BeautyAdminTag row should be created")
def no_extra_row(page):
    page.wait_for_timeout(500)
    assert _tag_count() == _STATE["before"]
