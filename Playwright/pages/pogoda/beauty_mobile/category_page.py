"""Locators for the RN Beauty category screen (`(customer)/category/[slug]`)."""

category_error = "css=[data-testid='category-error']"
category_empty = "css=[data-testid='category-empty']"


def provider_card(provider_id: int) -> str:
    return f"css=[data-testid='category-provider-{provider_id}']"


def service_card(service_id: int) -> str:
    return f"css=[data-testid='category-service-{service_id}']"
