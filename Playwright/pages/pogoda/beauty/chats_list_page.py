"""Page object for the chats list screen (`/pogoda/beauty/chats`).

Redesigned component (BeautyChatsComponent): root has data-testid="chats-root"
on `div.beauty-app.prov-shell`. Customer view adds class `cust-desk` and renders
app-cust-top-nav (header.cust-topnav) instead of a bottom nav.

Thread rows are `button.conv-row` with data-testid="chat-thread-{booking_id}".
Empty state is app-prov-empty-hint with data-testid="chats-empty".
Search filter input is `input.search-input` inside `div.search-row`.
"""

chats_root = "css=[data-testid='chats-root']"
chats_empty = "css=[data-testid='chats-empty']"
chats_no_match = "css=[data-testid='chats-no-match']"
search_input = "css=[data-testid='chats-root'] input.search-input"


def thread_card(booking_id: int) -> str:
    return f"css=[data-testid='chat-thread-{booking_id}']"


# Navigation: customer view uses the shared top nav (no bottom nav / no nav-chat testid).
# nav_chat_tab previously pointed at a non-existent data-testid='nav-chat'.
nav_chat_tab = "css=header.cust-topnav nav.nav button.nav-item:has-text('Messages')"
