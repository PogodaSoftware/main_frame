"""Locators for the RN Beauty provider detail (`(customer)/provider/[id]`)."""

provider_name = "css=[data-testid='provider-name']"
provider_error = "css=[data-testid='provider-error']"
provider_services_empty = "css=[data-testid='provider-services-empty']"


def service_card(service_id: int) -> str:
    return f"css=[data-testid='provider-service-{service_id}']"


def review_card(review_id: int) -> str:
    return f"css=[data-testid='provider-review-{review_id}']"


def review_reply(review_id: int) -> str:
    return f"css=[data-testid='provider-review-reply-{review_id}']"
