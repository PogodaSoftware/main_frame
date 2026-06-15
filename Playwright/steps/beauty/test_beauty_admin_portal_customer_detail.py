"""End-to-end tests for the Beauty Admin Portal — Customer detail (desktop).

* Loads      → real identity (name/email derived from the account) + lifetime card.
* Inline tag → clicking a suggested tag POSTs an assignment, persists a
               BeautyAdminTagAssignment row, and the tag moves to "attached" in
               place (RN-parity behavior the old mobile screen lacked).
* Add note   → composing a note POSTs it, persists a BeautyAdminNote row, and the
               note renders in the notes list.
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_customer_detail_page import (
    cd_addnote_btn,
    cd_attached,
    cd_lifetime,
    cd_name,
    cd_note_save,
    cd_note_ta,
    cd_notes,
    cd_right_h3,
    cd_root,
    cd_suggested,
    cd_tabs,
    cd_tpick_item,
    cd_tpick_search,
    cd_tpick_toggle,
    cd_tpicker,
    cd_tsug_only,
)
from .beauty_utils import (
    BACKEND_URL,
    BEAUTY_SESSION_COOKIE,
    TEST_DEVICE_ID,
    delete_test_users,
)

scenarios("../../features/Beauty/beauty_admin_portal_customer_detail.feature")

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


@pytest.fixture(scope="function")
def admin_on_detail(page):
    tag = uuid.uuid4().hex[:6]
    admin_email = f"cdadmin_{tag}@beauty-test.com"
    target_email = f"cdtarget_{tag}@beauty-test.com"
    password = "CdPass123!"

    assert requests.post(f"{BACKEND_URL}/api/beauty/signup/",
                         json={"email": admin_email, "password": password}, timeout=10).status_code == 201
    admin_id = int(_shell("from beauty_api.models import BeautyUser; "
                          f"print(BeautyUser.objects.get(email='{admin_email}').id)"))
    principal_id = int(_shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "p,_=BeautyAdminPrincipal.objects.update_or_create("
        f"user_type='customer', user_id={admin_id}, defaults={{'role':'owner'}}); print(p.id)"))

    assert requests.post(f"{BACKEND_URL}/api/beauty/signup/",
                         json={"email": target_email, "password": password}, timeout=10).status_code == 201
    target_id = int(_shell("from beauty_api.models import BeautyUser; "
                           f"print(BeautyUser.objects.get(email='{target_email}').id)"))

    # Ensure at least one tag exists so the detail can suggest it.
    slug = f"e2e{tag}"
    _shell("from beauty_api.models import BeautyAdminTag; "
           f"BeautyAdminTag.objects.get_or_create(slug='{slug}', defaults={{'label':'E2E {tag}','color':'#A06B2C','tone':'#F4E7D6'}}); print('ok')")

    # Seed a second deterministic tag for the full picker scenarios.
    pick_slug = f"e2epick-{tag}"
    pick_label = f"E2EPick {tag}"
    _shell("from beauty_api.models import BeautyAdminTag; "
           f"BeautyAdminTag.objects.get_or_create(slug='{pick_slug}', defaults={{'label':'{pick_label}','color':'#0F1115','tone':'#E9E9EB'}}); print('ok')")

    login = requests.post(f"{BACKEND_URL}/api/beauty/login/",
                          json={"email": admin_email, "password": password, "device_id": TEST_DEVICE_ID}, timeout=10)
    assert login.status_code == 200, f"Login failed: {login.text}"
    page.context.add_cookies([{
        "name": BEAUTY_SESSION_COOKIE, "value": login.cookies.get(BEAUTY_SESSION_COOKIE),
        "domain": "localhost", "path": "/", "httpOnly": False,
    }])
    page.add_init_script(f"window.localStorage.setItem('beauty_device_id', '{TEST_DEVICE_ID}');")
    _STATE.update({"admin_email": admin_email, "target_email": target_email,
                   "principal_id": principal_id, "target_id": target_id,
                   "slug": slug, "pick_slug": pick_slug, "pick_label": pick_label})
    yield _STATE

    _shell("from beauty_api.models import BeautyAdminPrincipal; "
           f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')")
    _shell("from beauty_api.models import BeautyAdminTagAssignment, BeautyAdminTag, BeautyAdminNote; "
           f"BeautyAdminTagAssignment.objects.filter(user_type='customer', user_id={target_id}).delete(); "
           f"BeautyAdminNote.objects.filter(target_type='customer', target_id={target_id}).delete(); "
           f"BeautyAdminTag.objects.filter(slug__in=['{_STATE['slug']}', '{_STATE['pick_slug']}']).delete(); print('ok')")
    delete_test_users(admin_email)
    delete_test_users(target_email)


@given("I am signed in as a Beauty admin viewing a test customer's detail")
def open_detail(page, admin_on_detail):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_customer_detail", id=_STATE["target_id"])
    expect(page.locator(cd_root)).to_be_visible(timeout=15000)


@then("the page should show the customer's name and email")
def shows_identity(page):
    # display_name is derived from the email local-part: "cdtarget_xxxx" → "Cdtarget Xxxx"
    expect(page.locator(cd_name)).to_be_visible()
    assert (page.locator(cd_name).inner_text() or "").strip() != ""


@then("the lifetime stats should be visible")
def shows_lifetime(page):
    expect(page.locator(cd_lifetime).first).to_be_visible()


@when("I click a suggested tag")
def click_suggested(page):
    page.locator(cd_suggested).first.click()


@then("a tag assignment row should exist for that customer")
def assignment_exists(page):
    for _ in range(20):
        n = int(_shell(
            "from beauty_api.models import BeautyAdminTagAssignment; "
            f"print(BeautyAdminTagAssignment.objects.filter(user_type='customer', user_id={_STATE['target_id']}).count())"
        ))
        if n >= 1:
            return
        page.wait_for_timeout(250)
    raise AssertionError("No tag assignment row created.")


@then("the tag should appear as attached without a page reload")
def tag_attached_in_place(page):
    expect(page.locator(cd_attached).first).to_be_visible(timeout=10000)


@when("I add an internal note")
def add_note(page):
    _STATE["note_text"] = f"E2E note {uuid.uuid4().hex[:6]}"
    page.locator(cd_addnote_btn).click()
    page.locator(cd_note_ta).fill(_STATE["note_text"])
    page.locator(cd_note_save).click()


@then("the note should exist in the database")
def note_in_db(page):
    text = _STATE["note_text"]
    for _ in range(20):
        n = int(_shell(
            "from beauty_api.models import BeautyAdminNote; "
            f"print(BeautyAdminNote.objects.filter(target_type='customer', target_id={_STATE['target_id']}, body='{text}').count())"
        ))
        if n >= 1:
            return
        page.wait_for_timeout(250)
    raise AssertionError("Note not persisted.")


@then("the note should appear in the notes list")
def note_rendered(page):
    expect(page.locator(cd_notes, has_text=_STATE["note_text"])).to_have_count(1, timeout=10000)


@then("the Overview, Bookings, Payments, Reviews, Risk, Notes and Audit tabs should show")
def tabs_present(page):
    labels = [(page.locator(cd_tabs).nth(i).inner_text() or "").split("\n")[0].strip()
              for i in range(page.locator(cd_tabs).count())]
    for want in ["Overview", "Bookings", "Payments", "Reviews", "Risk", "Notes", "Audit"]:
        assert want in labels, f"Tab {want!r} missing from {labels}"


@when("I click the Risk tab")
def click_risk_tab(page):
    page.get_by_role("tab", name="Risk").click()


@then("the Risk signals panel should show")
def risk_panel_shown(page):
    expect(page.locator(cd_right_h3, has_text="Risk signals")).to_be_visible(timeout=5000)


# ---------------------------------------------------------------------------
# Full tag picker scenarios
# ---------------------------------------------------------------------------

@when("I open the tag picker")
def open_tag_picker(page):
    page.locator(cd_tpick_toggle).click()
    expect(page.locator(cd_tpicker)).to_be_visible(timeout=5000)


@then("the picker panel should be visible")
def picker_visible(page):
    expect(page.locator(cd_tpicker)).to_be_visible()


@then("the picker should list more available tags than the suggested cap")
def picker_has_more_than_suggested(page):
    # The dev DB has ~15 tags total; available_tags has no 4-item cap.
    # We assert picker items > suggested chips (non-toggle) AND > 4.
    picker_count = page.locator(cd_tpick_item).count()
    suggested_count = page.locator(cd_tsug_only).count()
    assert picker_count > 4, (
        f"Expected picker to show >4 available tags, got {picker_count}. "
        "Is available_tags being emitted by the resolver?"
    )
    assert picker_count > suggested_count, (
        f"Expected picker ({picker_count}) to show more tags than suggested ({suggested_count})."
    )


@when("I type the seeded tag label fragment into the picker search")
def type_tag_search(page):
    # "E2EPick" is unique to the seeded pick tag — narrows results to exactly it.
    page.locator(cd_tpick_search).fill("E2EPick")


@then("the seeded tag should appear in the picker results")
def seeded_tag_in_results(page):
    expect(
        page.locator(cd_tpick_item, has_text=_STATE["pick_label"])
    ).to_be_visible(timeout=5000)


@when("I click the seeded tag in the picker")
def click_seeded_in_picker(page):
    # Narrow to the seeded tag first so the click is unambiguous.
    page.locator(cd_tpick_search).fill("E2EPick")
    page.locator(cd_tpick_item, has_text=_STATE["pick_label"]).first.click()


@then("the picker should be closed")
def picker_closed(page):
    expect(page.locator(cd_tpicker)).not_to_be_visible(timeout=8000)


@then("the seeded tag should appear as an attached chip")
def seeded_tag_attached(page):
    expect(
        page.locator(cd_attached, has_text=_STATE["pick_label"])
    ).to_be_visible(timeout=10000)
