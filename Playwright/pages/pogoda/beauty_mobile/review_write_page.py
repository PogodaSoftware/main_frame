"""Locators for the RN review-write screen (`(customer)/bookings/[id]/review`)."""

rw_service_card = "css=[data-testid='rw-service-card']"
rw_service_name = "css=[data-testid='rw-service-name']"
rw_provider_name = "css=[data-testid='rw-provider-name']"
rw_stars = "css=[data-testid='rw-stars']"
rw_body = "css=[data-testid='rw-body']"
rw_submit = "css=[data-testid='rw-submit']"
rw_error = "css=[data-testid='rw-error']"
rw_load_error = "css=[data-testid='rw-load-error']"


def rw_star(n: int) -> str:
    return f"css=[data-testid='rw-star-{n}']"
