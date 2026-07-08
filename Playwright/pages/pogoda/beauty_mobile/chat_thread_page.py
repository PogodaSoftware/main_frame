"""Locators for the RN chat thread screen (`(customer)/chats/[bookingId]`)."""

chat_info_card = "css=[data-testid='chat-info-card']"
chat_readonly = "css=[data-testid='chat-readonly']"
chat_empty = "css=[data-testid='chat-empty']"
chat_composer_input = "css=[data-testid='chat-composer-input']"
chat_send = "css=[data-testid='chat-send']"
chat_error = "css=[data-testid='chat-error']"
chat_send_error = "css=[data-testid='chat-send-error']"


def message(msg_id: int) -> str:
    return f"css=[data-testid='chat-msg-{msg_id}']"
