"""Locators for the Beauty bookings list page (`/pogoda/beauty/bookings`)."""

bookings_page_root = "css=div.beauty-app"

sub_header = "css=div.beauty-app header.sub-header"
sub_header_title = "css=div.beauty-app header.sub-header span.sub-header-title"
back_button = "css=div.beauty-app header.sub-header button.back-btn"

bookings_section = "css=div.beauty-app main.bookings-section"
page_title = "css=div.beauty-app main.bookings-section h1.page-title"
page_sub = "css=div.beauty-app main.bookings-section .page-sub"

segmented = "css=div.beauty-app .segmented"
seg_tab = "css=div.beauty-app .segmented button.seg-tab"
seg_tab_upcoming = "css=div.beauty-app .segmented button.seg-tab >> nth=0"
seg_tab_past = "css=div.beauty-app .segmented button.seg-tab >> nth=1"
seg_tab_active = "css=div.beauty-app .segmented button.seg-tab.is-active"

empty_card = "css=div.beauty-app .empty-card"
empty_title = "css=div.beauty-app .empty-card .empty-title"
browse_services_button = "css=div.beauty-app .empty-card button.btn-browse"

# Booking list cards.
booking_card = "css=div.beauty-app .b-card"
booking_card_first = "css=div.beauty-app .b-card >> nth=0"
booking_title = "css=div.beauty-app .b-card .b-title"
booking_title_button = "css=div.beauty-app .b-card button.b-card-title-btn"
booking_status = "css=div.beauty-app .b-card .b-status"
booking_place = "css=div.beauty-app .b-card .b-place"
booking_when = "css=div.beauty-app .b-card .b-when"

bottom_nav = "css=div.beauty-app nav.bottom-nav"
