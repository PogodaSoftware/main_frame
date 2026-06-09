"""Locators for the Beauty provider detail page (`/pogoda/beauty/providers/:id`)."""

provider_page_root = "css=div.beauty-app"

sub_header = "css=div.beauty-app header.sub-header"
back_button = "css=div.beauty-app header.sub-header button.back-btn"
save_button = "css=div.beauty-app header.sub-header button.save-btn"

hero = "css=div.beauty-app section.hero-cover"
hero_title = "css=div.beauty-app section.hero-cover h1.hero-title"
hero_categories = "css=div.beauty-app section.hero-cover .hero-categories"

meta_pills = "css=div.beauty-app .meta-pill"
address_line = "css=div.beauty-app .address-line"
description = "css=div.beauty-app p.description"

services_head = "css=div.beauty-app .services-head"
services_title = "css=div.beauty-app .services-head h2.services-title >> text=Services"
services_count = "css=div.beauty-app .services-head .services-count"

service_card = "css=div.beauty-app .service-card"
service_row = "css=div.beauty-app .service-row"
service_name = "css=div.beauty-app .service-row .service-name"
book_button = "css=div.beauty-app .service-row button.btn-book"

reviews_section = "css=[data-testid='reviews-section']"
reviews_count_pill = "css=[data-testid='reviews-count-pill']"
reviews_empty = "css=[data-testid='reviews-empty']"
review_card = "css=[data-testid='review-card']"
review_body = "css=[data-testid='review-body']"
review_business_reply = "css=[data-testid='review-business-reply']"
review_delete_btn = "css=[data-testid='review-delete-btn']"
leave_review_btn = "css=[data-testid='leave-review-btn']"
service_favorite_btn = "css=[data-testid='favorite-toggle']"
provider_avg_rating = "css=[data-testid='provider-avg-rating']"
provider_review_count = "css=[data-testid='provider-review-count']"
provider_no_reviews = "css=[data-testid='provider-no-reviews']"

bottom_nav = "css=div.beauty-app nav.bottom-nav"
nav_tab_bookings = "css=div.beauty-app nav.bottom-nav button.nav-tab >> nth=0"
nav_tab_home = "css=div.beauty-app nav.bottom-nav button.nav-tab >> nth=1"
nav_tab_profile = "css=div.beauty-app nav.bottom-nav button.nav-tab >> nth=2"
