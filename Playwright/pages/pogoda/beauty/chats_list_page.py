"""Page object for the chats list screen (`/pogoda/beauty/chats`)."""

chats_root = "css=[data-testid='chats-root']"
chats_empty = "css=[data-testid='chats-empty']"


def thread_card(booking_id: int) -> str:
    return f"css=[data-testid='chat-thread-{booking_id}']"


nav_chat_tab = "css=[data-testid='nav-chat']"
