"""Page object for business reviews screen (/(business)/reviews)."""
from playwright.sync_api import Page

reviews_heading = ":text('Customer Reviews')"
reviews_empty_state = ":text('No reviews yet')"


def review_reply_input(review_id: int) -> str:
    return f"css=[data-testid='review-reply-input-{review_id}']"


def review_reply_submit(review_id: int) -> str:
    return f"css=[data-testid='review-reply-submit-{review_id}']"
