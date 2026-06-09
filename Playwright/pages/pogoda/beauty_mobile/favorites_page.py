"""Locators for the RN favorites screen (`(customer)/favorites`)."""

favorites_title = "css=[data-testid='favorites-title']"
favorites_empty = "css=[data-testid='favorites-empty']"


def favorites_card(favorite_id: int) -> str:
    return f"css=[data-testid='favorites-card-{favorite_id}']"


def favorites_remove(favorite_id: int) -> str:
    return f"css=[data-testid='favorites-remove-{favorite_id}']"
