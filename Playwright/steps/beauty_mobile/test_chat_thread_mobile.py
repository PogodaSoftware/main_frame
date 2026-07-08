"""Smoke port of ``test_beauty_chat.py`` for the RN web build."""

import pytest
from playwright.sync_api import Page, expect

from Playwright.Hooks.mobile_hooks import selecting_different_routes_mobile
from Playwright.pages.pogoda.beauty_mobile.chat_thread_page import (
    chat_composer_input,
    chat_error,
    chat_info_card,
    chat_send,
)
from Playwright.steps.beauty_mobile._auth_helpers import ui_login_mobile


@pytest.mark.skip(reason="Phase 4c: requires active chat thread — port once chat-seed helper migrated.")
def test_chat_thread_composer_visible(page: Page, test_customer):
    ui_login_mobile(page, test_customer["email"], test_customer["password"])
    selecting_different_routes_mobile(page, "beauty_chat_thread", bookingId="1")
    page.wait_for_timeout(1500)
    expect(page.locator(chat_error)).to_have_count(0)
    expect(page.locator(chat_info_card)).to_be_visible()
    expect(page.locator(chat_composer_input)).to_be_visible()
    expect(page.locator(chat_send)).to_be_visible()
