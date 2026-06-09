"""Locators for the Beauty search page (`/pogoda/beauty/search`)."""

search_page_root = "css=div.beauty-app[data-testid='beauty-search-root']"
search_input = "css=input[data-testid='search-input']"
search_status = "css=[data-testid='search-status']"
search_location_pill = "css=[data-testid='search-location']"

search_results = "css=[data-testid='search-results']"
search_result_card = "css=[data-testid='search-result-card']"
search_result_link = "css=[data-testid='search-result-link']"
search_result_favorite_btn = "css=[data-testid='search-favorite-toggle']"
search_result_business = "css=[data-testid='search-result-business']"
search_future_badge = "css=[data-testid='search-future-badge']"
search_empty = "css=[data-testid='search-empty']"
search_sentinel = "css=[data-testid='search-sentinel']"
search_end_marker = "css=[data-testid='search-end-marker']"

search_rate_toast = "css=[data-testid='search-rate-toast']"
search_error_toast = "css=[data-testid='search-error-toast']"

# Pagination markers — assert these are NOT present.
pagination_next = "css=button.pagination-next, button[aria-label='Next page']"
pagination_prev = "css=button.pagination-prev, button[aria-label='Previous page']"
pagination_numbers = "css=.pagination, ul.pagination li"
