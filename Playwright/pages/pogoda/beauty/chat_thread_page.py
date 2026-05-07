"""Page object for a single booking's chat thread."""

chat_thread_root = "css=[data-testid='chat-thread-root']"
peer_name = "css=[data-testid='chat-peer-name']"
phone_button = "css=[data-testid='chat-phone']"
back_button = "css=[data-testid='chat-back']"
messages_pane = "css=[data-testid='messages-pane']"
composer = "css=[data-testid='chat-composer']"
composer_disabled = "css=[data-testid='composer-disabled']"
input_box = "css=[data-testid='chat-input']"
send_button = "css=[data-testid='chat-send']"


def message(msg_id: int) -> str:
    return f"css=[data-testid='msg-{msg_id}']"
