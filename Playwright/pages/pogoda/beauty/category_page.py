"""Locators for the Beauty category page (`/pogoda/beauty/category/:slug`).

Redesigned component (BeautyCategoryComponent): root is `div.beauty-app.cust-desk`.
Layout: app-cust-top-nav (header.cust-topnav), breadcrumb (div.crumb), hero
(section.hero-cover), then scroll-body with meta pills, services-head, and a
service-card containing service-row items.

There is NO bottom nav and NO sub-header / back-btn in the redesign.
Back navigation is via the breadcrumb button (button.crumb-link) or the top nav.
hero_title is h2.hero-title (was wrongly typed as h1 previously).
"""

category_page_root = "css=div.beauty-app"

# Breadcrumb navigation (replaces the old sub_header / back_button).
crumb = "css=div.beauty-app div.crumb"
back_button = "css=div.beauty-app div.crumb button.crumb-link"

# sub_header and save_button do not exist in the redesign; kept as None
# so any import that references them gets an explicit error rather than a
# silent wrong selector.
sub_header = None
save_button = None

# Hero section.
hero = "css=div.beauty-app section.hero-cover"
# hero_title is h2 in the redesign (NOT h1 as the old selector said).
hero_title = "css=div.beauty-app .hero-overlay h2.hero-title"
hero_categories = "css=div.beauty-app .hero-overlay .hero-categories"

meta_pill = "css=div.beauty-app .meta-pill"

services_head = "css=div.beauty-app .services-head"
services_title = "css=div.beauty-app .services-head h2.services-title"
services_count = "css=div.beauty-app .services-head .services-count"

service_card = "css=div.beauty-app .service-card"
service_row = "css=div.beauty-app .service-row"
service_name = "css=div.beauty-app .service-row .service-name"
service_provider_button = "css=div.beauty-app .service-row button.service-cat"
book_button = "css=div.beauty-app .service-row button.btn-book"
empty_state_card = "css=div.beauty-app .service-empty-card"

# Top nav (replaces bottom_nav — redesign uses shared app-cust-top-nav).
# Labels: Discover / My bookings / Saved / Messages.
top_nav = "css=header.cust-topnav"
nav_item = "css=header.cust-topnav nav.nav button.nav-item"

# Alias so existing step `category_bottom_nav` import continues to resolve.
bottom_nav = top_nav
nav_tab_bookings = "css=header.cust-topnav nav.nav button.nav-item:has-text('My bookings')"
nav_tab_home = "css=header.cust-topnav nav.nav button.nav-item:has-text('Discover')"
nav_tab_profile = "css=header.cust-topnav .account"
