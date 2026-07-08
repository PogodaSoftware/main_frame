"""End-to-end tests for the Beauty Admin Portal — Provider detail (desktop).

Twin of the customer detail. Regression cover for the bug where opening a
business provider's account dropped into the old phone-frame layout.

* Renders identity + performance + section tabs on the shared admin-web chrome.
* Tabs switch panels (Services catalog).
* Inline tag assign persists a business BeautyAdminTagAssignment row and shows
  the tag as attached in place (RN parity).
"""

import subprocess
import uuid

import pytest
import requests
from playwright.sync_api import expect
from pytest_bdd import given, scenarios, then, when

from Playwright.Hooks.hooks import goto_route
from Playwright.pages.pogoda.beauty.admin_portal_provider_detail_page import (
    pd_attached,
    pd_name,
    pd_perf,
    pd_right_h3,
    pd_root,
    pd_suggested,
    pd_tabs,
    pd_tpick_item,
    pd_tpick_search,
    pd_tpick_toggle,
    pd_tpicker,
    pd_tsug_only,
)
from .beauty_utils import BACKEND_URL, BEAUTY_SESSION_COOKIE, TEST_DEVICE_ID, delete_test_users

scenarios("../../features/Beauty/beauty_admin_portal_provider_detail.feature")

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
def admin_on_provider(page):
    tag = uuid.uuid4().hex[:6]
    admin_email = f"pdadmin_{tag}@beauty-test.com"
    prov_email = f"pdprov_{tag}@beauty-test.com"
    password = "PdPass123!"

    assert requests.post(f"{BACKEND_URL}/api/beauty/signup/",
                         json={"email": admin_email, "password": password}, timeout=10).status_code == 201
    admin_id = int(_shell("from beauty_api.models import BeautyUser; "
                          f"print(BeautyUser.objects.get(email='{admin_email}').id)"))
    principal_id = int(_shell(
        "from beauty_api.models import BeautyAdminPrincipal; "
        "p,_=BeautyAdminPrincipal.objects.update_or_create("
        f"user_type='customer', user_id={admin_id}, defaults={{'role':'owner'}}); print(p.id)"))

    # Target provider + a tag to suggest.
    prov_id = int(_shell(
        "from beauty_api.models import BusinessProvider; "
        f"p=BusinessProvider.objects.create(email='{prov_email}', password='x', business_name='Test Studio {tag}'); print(p.id)"))
    slug = f"pd{tag}"
    _shell("from beauty_api.models import BeautyAdminTag; "
           f"BeautyAdminTag.objects.get_or_create(slug='{slug}', defaults={{'label':'PD {tag}','color':'#A06B2C','tone':'#F4E7D6'}}); print('ok')")

    # Seed a second deterministic tag for the full picker scenarios.
    pick_slug = f"pdpick-{tag}"
    pick_label = f"PDPick {tag}"
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
    _STATE.update({"admin_email": admin_email, "prov_email": prov_email,
                   "principal_id": principal_id, "prov_id": prov_id,
                   "slug": slug, "pick_slug": pick_slug, "pick_label": pick_label})
    yield _STATE

    _shell("from beauty_api.models import BeautyAdminPrincipal; "
           f"BeautyAdminPrincipal.objects.filter(id={principal_id}).delete(); print('ok')")
    _shell("from beauty_api.models import BeautyAdminTagAssignment, BeautyAdminTag, BusinessProvider; "
           f"BeautyAdminTagAssignment.objects.filter(user_type='business', user_id={prov_id}).delete(); "
           f"BeautyAdminTag.objects.filter(slug__in=['{_STATE['slug']}', '{_STATE['pick_slug']}']).delete(); "
           f"BusinessProvider.objects.filter(id={prov_id}).delete(); print('ok')")
    delete_test_users(admin_email)


@given("I am signed in as a Beauty admin viewing a test provider's detail")
def open_provider(page, admin_on_provider):
    page.set_viewport_size({"width": 1280, "height": 900})
    goto_route(page, "beauty_admin_portal_provider_detail", id=_STATE["prov_id"])
    expect(page.locator(pd_root)).to_be_visible(timeout=15000)


@then("the provider name and performance card should show")
def name_and_perf(page):
    expect(page.locator(pd_name)).to_be_visible()
    expect(page.locator(pd_perf).first).to_be_visible()


@then("the Overview, Services, Reviews, Hours, Risk and Notes tabs should show")
def tabs_show(page):
    labels = [(page.locator(pd_tabs).nth(i).inner_text() or "").split("\n")[0].strip()
              for i in range(page.locator(pd_tabs).count())]
    for want in ["Overview", "Services", "Reviews", "Hours", "Risk", "Notes"]:
        assert want in labels, f"Tab {want!r} missing from {labels}"


@when("I click the Services tab")
def click_services(page):
    page.get_by_role("tab", name="Services").click()


@then("the service catalog panel should show")
def catalog_shows(page):
    expect(page.locator(pd_right_h3, has_text="Service catalog")).to_be_visible(timeout=5000)


@when("I click a suggested tag")
def click_suggested(page):
    page.locator(pd_suggested).first.click()


@then("a business tag assignment row should exist for that provider")
def assignment_exists(page):
    for _ in range(20):
        n = int(_shell(
            "from beauty_api.models import BeautyAdminTagAssignment; "
            f"print(BeautyAdminTagAssignment.objects.filter(user_type='business', user_id={_STATE['prov_id']}).count())"
        ))
        if n >= 1:
            return
        page.wait_for_timeout(250)
    raise AssertionError("No business tag assignment row created.")


@then("the tag should appear as attached without a page reload")
def attached_in_place(page):
    expect(page.locator(pd_attached).first).to_be_visible(timeout=10000)


# ---------------------------------------------------------------------------
# Full tag picker scenarios
# ---------------------------------------------------------------------------

@when("I open the provider tag picker")
def open_provider_tag_picker(page):
    page.locator(pd_tpick_toggle).click()
    expect(page.locator(pd_tpicker)).to_be_visible(timeout=5000)


@then("the provider picker panel should be visible")
def provider_picker_visible(page):
    expect(page.locator(pd_tpicker)).to_be_visible()


@then("the provider picker should list more available tags than the suggested cap")
def provider_picker_has_more_than_suggested(page):
    picker_count = page.locator(pd_tpick_item).count()
    suggested_count = page.locator(pd_tsug_only).count()
    assert picker_count > 4, (
        f"Expected picker to show >4 available tags, got {picker_count}. "
        "Is available_tags being emitted by the provider detail resolver?"
    )
    assert picker_count > suggested_count, (
        f"Expected picker ({picker_count}) to show more tags than suggested ({suggested_count})."
    )


@when("I type the seeded tag label fragment into the provider picker search")
def type_provider_tag_search(page):
    # "PDPick" is unique to the seeded pick tag — narrows results to exactly it.
    page.locator(pd_tpick_search).fill("PDPick")


@then("the seeded tag should appear in the provider picker results")
def seeded_tag_in_provider_results(page):
    expect(
        page.locator(pd_tpick_item, has_text=_STATE["pick_label"])
    ).to_be_visible(timeout=5000)


@when("I click the seeded tag in the provider picker")
def click_seeded_in_provider_picker(page):
    page.locator(pd_tpick_search).fill("PDPick")
    page.locator(pd_tpick_item, has_text=_STATE["pick_label"]).first.click()


@then("the provider picker should be closed")
def provider_picker_closed(page):
    expect(page.locator(pd_tpicker)).not_to_be_visible(timeout=8000)


@then("the seeded tag should appear as an attached provider chip")
def seeded_provider_tag_attached(page):
    expect(
        page.locator(pd_attached, has_text=_STATE["pick_label"])
    ).to_be_visible(timeout=10000)
