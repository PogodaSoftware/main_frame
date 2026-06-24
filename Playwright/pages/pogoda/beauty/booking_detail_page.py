"""Locators for the Beauty booking detail page (`/pogoda/beauty/bookings/:id`).

Root is div.cust-status (redesigned desktop layout: CustTopNav + two-column
grid with .col-main cards and .col-side sticky manage panel).
"""

booking_detail_page_root = "css=div.cust-status"

# Breadcrumb (replaces old sub-header).
sub_header = "css=div.cust-status .crumb"
sub_header_title = "css=div.cust-status .crumb button.crumb-link"
back_button = "css=div.cust-status .crumb button.crumb-link"

# Title row — status pill + h1 + total.
hero = "css=div.cust-status .title-row"
detail_section = "css=div.cust-status .grid"
title = "css=div.cust-status h1.title"
price = "css=div.cust-status .total-v"
meta = "css=div.cust-status .at"
status_chip = "css=div.cust-status .pill"

# At-a-glance card facts (replaces old .info-card/.info-row/.info-label/.info-value).
info_card = "css=div.cust-status .card.glance"
info_row = "css=div.cust-status .glance-grid .fact"
info_label = "css=div.cust-status .glance-grid .fact-k"
info_value = "css=div.cust-status .glance-grid .fact-v"

# Server / cancel error message.
server_error = "css=div.cust-status p.server-error"

# Manage panel (right sticky column) — replaces old .cta-row.
cta_row = "css=div.cust-status .card.manage .manage-actions"
reschedule_button = "css=div.cust-status .card.manage button.btn--primary"
cancel_button = "css=div.cust-status .card.manage button.btn--danger-outline"
view_provider_button = "css=div.cust-status .manage-two button.btn--secondary >> nth=0"

# No bottom nav in redesigned desktop layout; keep variable pointing to manage
# panel footer so existing step (to_be_visible) doesn't hard-fail on import.
bottom_nav = "css=div.cust-status .card.manage"
