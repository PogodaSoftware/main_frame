"""Locators for the RN Beauty search screen (`(customer)/search`)."""

search_keyword_input = "css=[data-testid='search-keyword-input']"
search_location_input = "css=[data-testid='search-location-input']"
search_submit = "css=[data-testid='search-submit']"
search_load_more = "css=[data-testid='search-load-more']"
search_empty = "css=[data-testid='search-empty']"
search_error = "css=[data-testid='search-error']"


def search_result_card(service_id: int) -> str:
    return f"css=[data-testid='search-result-{service_id}']"
