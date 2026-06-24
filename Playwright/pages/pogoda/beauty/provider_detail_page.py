"""Locators for the Beauty provider detail page (`/pogoda/beauty/providers/:id`).

Root is now ``div.cust-detail`` (was ``div.beauty-app``).
The page is tabbed: Services / Reviews / About / Location.
- Reviews content (`[data-testid="reviews-section"]`) only renders under the
  Reviews tab — click ``tab_reviews`` first.
- Service cards and book buttons only render under the Services tab (default).
"""

provider_page_root = "css=div.cust-detail"

# ── Hero ─────────────────────────────────────────────────────────────────────
# Was: section.hero-cover  →  now: section.hero
hero = "css=div.cust-detail section.hero"
hero_title = "css=div.cust-detail section.hero h1.hero-title"
# .hero-categories no longer exists; category chips are shown as .eyebrow text
hero_eyebrow = "css=div.cust-detail section.hero .eyebrow"

# Hero-meta: avg rating and review count live here (data-testid preserved)
provider_avg_rating = "css=[data-testid='provider-avg-rating']"
provider_review_count = "css=[data-testid='provider-review-count']"

# ── Tab bar ───────────────────────────────────────────────────────────────────
# All tabs use button.tab; active tab gets class .is-active.
tab_services  = "css=div.cust-detail button.tab:nth-of-type(1)"
tab_reviews   = "css=div.cust-detail button.tab:nth-of-type(2)"
tab_about     = "css=div.cust-detail button.tab:nth-of-type(3)"
tab_location  = "css=div.cust-detail button.tab:nth-of-type(4)"

# ── Services tab content ──────────────────────────────────────────────────────
# Was: .services-head h2.services-title / .services-count
# Now: .section-head contains .section-title and .section-sub
services_head  = "css=div.cust-detail .section-head"
services_title = "css=div.cust-detail .section-title"   # text="Services"
services_count = "css=div.cust-detail .section-sub"

# Was: .service-card / .service-row — now article.svc-card / div.svc-main
# There is no .service-row class in the new template.
service_card = "css=div.cust-detail article.svc-card"
# Kept alias so steps that imported service_row still resolve:
service_row  = "css=div.cust-detail article.svc-card"   # alias — .service-row removed
service_name = "css=div.cust-detail .svc-name"

# Book button inside each service card.
# Was: button.btn-book  →  now: button.btn.btn--primary.btn--sm inside .svc-actions
book_button = "css=div.cust-detail .svc-actions button.btn--primary"

# Favorite toggle (data-testid preserved from old template)
service_favorite_btn = "css=[data-testid='favorite-toggle']"

# ── Reviews tab content ───────────────────────────────────────────────────────
# data-testid attributes are PRESERVED in the new template.
reviews_section       = "css=[data-testid='reviews-section']"
reviews_count_pill    = "css=[data-testid='reviews-count-pill']"
reviews_empty         = "css=[data-testid='reviews-empty']"
review_card           = "css=[data-testid='review-card']"
review_body           = "css=[data-testid='review-body']"
review_business_reply = "css=[data-testid='review-business-reply']"
review_delete_btn     = "css=[data-testid='review-delete-btn']"
leave_review_btn      = "css=[data-testid='leave-review-btn']"
provider_no_reviews   = "css=[data-testid='reviews-empty']"   # alias

# ── Removed elements (documented; do not use in new tests) ────────────────────
# meta_pills      — was .meta-pill; class does not exist in new template.
# address_line    — was .address-line; location now rendered inside hero-meta
#                   as .meta-mono or in the Location tab's .loc-addr.
# description     — was p.description; long_description now in About tab (.about-body).
# bottom_nav      — was nav.bottom-nav; component now uses CustTopNav at the top.
# nav_tab_*       — bottom-nav tabs removed; navigation is CustTopNav.

# ── Top nav (replaces bottom_nav) ─────────────────────────────────────────────
# The CustTopNavComponent is rendered at the top; assert presence via the host tag.
top_nav = "css=div.cust-detail app-cust-top-nav"

# Legacy alias kept so the one remaining step import compiles without error.
# The bottom nav is gone from this component; step assertions should migrate
# to `top_nav` or be dropped.
bottom_nav = "css=div.cust-detail app-cust-top-nav"
