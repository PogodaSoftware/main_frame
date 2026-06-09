"""Locators for the Beauty home screen (`/pogoda/beauty`).

The home page now requires authentication (beautyAuthGuard). Authenticated
users see the carousel + map sections plus a 3-tab bottom nav. The brand-name
button and user email badge that lived on the old home header have been
removed. For unauthenticated visitors the route redirects to the welcome page.
"""

home_page_root = "css=div.beauty-app"

# Carousel and map sections on home.
services_section = "css=div.beauty-app section.services-section"
services_carousel = "css=div.beauty-app .services-carousel"
home_carousel = "css=[data-testid='home-carousel']"
carousel_item = "css=div.beauty-app button.carousel-item"
map_section = "css=div.beauty-app section.map-section"

# Home page search bar (above the carousel).
home_search_section = "css=[data-testid='home-search']"
home_search_input = "css=[data-testid='home-search-input']"
home_search_status = "css=[data-testid='home-search-status']"
home_search_results = "css=[data-testid='home-search-results']"
home_search_result_card = "css=[data-testid='search-result-card']"
home_search_future_badge = "css=[data-testid='home-search-future-badge']"
home_search_empty = "css=[data-testid='home-search-empty']"
home_search_rate_toast = "css=[data-testid='home-search-rate-toast']"
home_search_error_toast = "css=[data-testid='home-search-error-toast']"

# Pagination markers — must be absent.
home_pagination_next = "css=button.pagination-next, button[aria-label='Next page']"
home_pagination_prev = "css=button.pagination-prev, button[aria-label='Previous page']"
home_pagination_numbers = "css=.pagination, ul.pagination li"

# Bottom nav (auth-only). Tabs in DOM order: bookings, home, profile.
bottom_nav = "css=div.beauty-app nav.bottom-nav"
nav_tab_bookings = "css=div.beauty-app nav.bottom-nav button.nav-tab >> text=Bookings"
nav_tab_home = "css=div.beauty-app nav.bottom-nav button.nav-tab >> text=Home"
nav_tab_profile = "css=div.beauty-app nav.bottom-nav button.nav-tab >> text=Profile"
active_nav_tab = "css=div.beauty-app nav.bottom-nav button.nav-tab.is-active"

# Header CTA buttons appear only when the home BFF resolver returns
# corresponding link rels (e.g. legacy unauthenticated render). Auth users no
# longer see the header at all — these locators are kept so older feature
# specs that exercise the unauth branch continue to compile.
signin_button = "css=div.beauty-app .header-actions button.btn-login"
signup_button = "css=div.beauty-app .header-actions button.btn-signup"
business_login_button = "css=div.beauty-app .header-actions button.btn-business-login"
signout_button = "css=div.beauty-app .header-actions button.btn-logout"
