"""Locators for the Beauty home screen (`/pogoda/beauty`).

Redesigned home (BeautyMainComponent): root is `div.cust-home`, inner content
in `main.home-main`. Authenticated users see:
  - hero section (`section.hero`)
  - category grid (`section.cats` > `div.cat-grid` > `button.cat`)
  - studios-near-you row (`section.studios`) — presentational only, no BFF data
  - map section (`section.map-row`)
  - top nav (`header.cust-topnav` in app-cust-top-nav, with `nav.nav` > `button.nav-item`)

There is NO bottom nav and NO carousel in the redesign.
Unauthenticated visitors are redirected to the welcome page.
"""

home_page_root = "css=div.cust-home"

# Main content wrapper.
home_main = "css=div.cust-home main.home-main"

# Category section (BFF-driven services → `button.cat` tiles).
# Replaces the old services_section / services_carousel / carousel_item.
services_section = "css=div.cust-home section.cats"
cat_grid = "css=div.cust-home .cat-grid"
cat_item = "css=div.cust-home .cat-grid button.cat"

# Map section.
map_section = "css=div.cust-home section.map-row"

# Studios-near-you row (presentational demo data, no BFF feed yet).
studios_section = "css=div.cust-home section.studios"
studio_card = "css=div.cust-home article.studio-card"

# Filter chips inside the studios section.
studio_filter_chip = "css=div.cust-home section.studios button.chip"
active_studio_filter = "css=div.cust-home section.studios button.chip.is-active"

# Home page search bar (projected into top-nav search slot via BeautyHomeSearchComponent).
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

# Top nav (auth-only, desktop sticky). Replaces the old bottom_nav.
# Rendered by app-cust-top-nav → header.cust-topnav.
# Labels: Discover / My bookings / Saved / Messages.
top_nav = "css=header.cust-topnav"
nav_item = "css=header.cust-topnav nav.nav button.nav-item"
nav_tab_discover = "css=header.cust-topnav nav.nav button.nav-item:has-text('Discover')"
nav_tab_bookings = "css=header.cust-topnav nav.nav button.nav-item:has-text('My bookings')"
nav_tab_saved = "css=header.cust-topnav nav.nav button.nav-item:has-text('Saved')"
nav_tab_messages = "css=header.cust-topnav nav.nav button.nav-item:has-text('Messages')"
active_nav_item = "css=header.cust-topnav nav.nav button.nav-item.is-active"

# Notification bell + its dropdown panel (signed-in only).
notif_bell = "css=header.cust-topnav button.bell"
notif_panel = "css=header.cust-topnav .notif-panel"

# Aliases kept so any step that referenced the old names still resolves.
# Point at the new equivalents — bottom_nav pointed at the old mobile nav;
# now the nearest equivalent is the top nav header.
bottom_nav = top_nav
nav_tab_home = nav_tab_discover

# Profile entry point: the account button (avatar + name) in the top nav.
# Replaces the old bottom-nav profile tab.
nav_tab_profile = "css=header.cust-topnav button.account"

# Carousel aliases — the home carousel was replaced by the category grid.
# Steps that clicked carousel_item / home_carousel to start a booking flow
# should now click a cat_item tile. Aliased here so imports don't break;
# update the step logic if the intent was to pick a specific category.
carousel_item = cat_item
home_carousel = cat_grid

# Guest (signed-out) CTA buttons inside the top-nav.
signin_button = "css=header.cust-topnav button.btn.btn--secondary"
signup_button = "css=header.cust-topnav button.btn.btn--primary"
# business_login_button: no dedicated business-login button in the new nav.
business_login_button = "css=header.cust-topnav button.btn.btn--primary"
# signout_button: no explicit sign-out button in the topnav (profile menu).
signout_button = "css=header.cust-topnav .account"

# ---------------------------------------------------------------------------
# Location chip (Fix 1 + Fix 3)
# After redesign, .location-chip is a DIRECT CHILD of header.cust-topnav —
# a SIBLING of .search, not a descendant.  Contains .search-sep and
# .search-city spans (which must NOT exist inside .search anymore).
# ---------------------------------------------------------------------------
location_chip = "css=header.cust-topnav .location-chip"
# Negative selector: these children must be absent from inside .search pill.
search_sep_inside_search = "css=header.cust-topnav .search .search-sep"
search_city_inside_search = "css=header.cust-topnav .search .search-city"

# ---------------------------------------------------------------------------
# Search pill width fix
# The projected search fills the pill (native ✕ flush-right) and the
# results/empty dropdown spans the pill width, not a fixed 440px.
# ---------------------------------------------------------------------------
search_pill = "css=header.cust-topnav .search"
