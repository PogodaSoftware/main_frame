"""Locators for the Beauty bookings list page (`/pogoda/beauty/bookings`).

Root is div.cust-bookings (redesigned desktop layout: CustTopNav + .bk-main
with filter chips and card rows; no bottom nav, no .segmented, no .b-card).
"""

bookings_page_root = "css=div.cust-bookings"

# No dedicated sub-header; top-nav is app-cust-top-nav.
sub_header = "css=div.cust-bookings app-cust-top-nav"
sub_header_title = "css=div.cust-bookings h1.title"
back_button = "css=div.cust-bookings app-cust-top-nav"   # no back button on this screen

# Main section and title.
bookings_section = "css=div.cust-bookings main.bk-main"
page_title = "css=div.cust-bookings h1.title"             # was main.bookings-section h1.page-title
page_sub = "css=div.cust-bookings .subtitle"              # was .page-sub → .subtitle

# Filter chips (replaces .segmented / .seg-tab).
segmented = "css=div.cust-bookings .chips"                # was .segmented → .chips
seg_tab = "css=div.cust-bookings .chips button.chip"      # was button.seg-tab → button.chip
seg_tab_upcoming = "css=div.cust-bookings .chips button.chip >> nth=0"
seg_tab_past = "css=div.cust-bookings .chips button.chip >> nth=1"
seg_tab_active = "css=div.cust-bookings .chips button.chip.is-active"

# Empty state card (class unchanged: .empty-card / .empty-title).
empty_card = "css=div.cust-bookings .empty-card"
empty_title = "css=div.cust-bookings .empty-card .empty-title"
# CTA in empty-card is now btn--primary (was button.btn-browse).
browse_services_button = "css=div.cust-bookings .empty-card button.btn--primary"

# Booking list cards (redesigned as article.card.row, no .b-card hierarchy).
booking_card = "css=div.cust-bookings article.card.row"
booking_card_first = "css=div.cust-bookings article.card.row >> nth=0"
booking_title = "css=div.cust-bookings article.card.row .row-name"
# "Open →" ghost button navigates to the detail; replaces old b-card-title-btn.
booking_title_button = "css=div.cust-bookings article.card.row button.btn--ghost"
booking_status = "css=div.cust-bookings article.card.row .chip-status"
booking_place = "css=div.cust-bookings article.card.row .row-at"
booking_when = "css=div.cust-bookings article.card.row .row-meta"

# No bottom nav in redesigned desktop layout.
bottom_nav = "css=div.cust-bookings .bk-main"            # was nav.bottom-nav → main area
