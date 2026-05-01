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
carousel_item = "css=div.beauty-app button.carousel-item"
map_section = "css=div.beauty-app section.map-section"

# Bottom nav (auth-only). Tabs in DOM order: bookings, home, profile.
bottom_nav = "css=div.beauty-app nav.bottom-nav"
nav_tab_bookings = "css=div.beauty-app nav.bottom-nav button.nav-tab >> nth=0"
nav_tab_home = "css=div.beauty-app nav.bottom-nav button.nav-tab >> nth=1"
nav_tab_profile = "css=div.beauty-app nav.bottom-nav button.nav-tab >> nth=2"
active_nav_tab = "css=div.beauty-app nav.bottom-nav button.nav-tab.is-active"

# Header CTA buttons appear only when the home BFF resolver returns
# corresponding link rels (e.g. legacy unauthenticated render). Auth users no
# longer see the header at all — these locators are kept so older feature
# specs that exercise the unauth branch continue to compile.
signin_button = "css=div.beauty-app .header-actions button.btn-login"
signup_button = "css=div.beauty-app .header-actions button.btn-signup"
business_login_button = "css=div.beauty-app .header-actions button.btn-business-login"
signout_button = "css=div.beauty-app .header-actions button.btn-logout"
