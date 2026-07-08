"""Locators for the RN Beauty service detail (`(customer)/service/[id]`)."""

service_name = "css=[data-testid='service-name']"
service_summary_card = "css=[data-testid='service-summary-card']"
service_provider_card = "css=[data-testid='service-provider-card']"
service_view_provider = "css=[data-testid='service-view-provider']"
service_favorite_toggle = "css=[data-testid='service-favorite-toggle']"
service_error = "css=[data-testid='service-error']"
service_reviews_empty = "css=[data-testid='service-reviews-empty']"


def review_card(review_id: int) -> str:
    return f"css=[data-testid='service-review-{review_id}']"


def review_reply(review_id: int) -> str:
    return f"css=[data-testid='service-review-reply-{review_id}']"
