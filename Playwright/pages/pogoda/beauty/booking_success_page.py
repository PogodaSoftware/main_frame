"""Locators for the Beauty booking success page (`/pogoda/beauty/bookings/:id/success`).

Root is div.cust-confirm (redesigned desktop layout: CustTopNav + centred
confirm-inner with a head block and a single .card containing facts + actions).
No share button, no bottom nav, no separate summary-card or conf-chip in new
design — confirmation code is a .fact inside the .card .facts grid.
"""

booking_success_page_root = "css=div.cust-confirm"

# No share button or sub-header in new design; point to top-nav as nearest
# equivalent so imports from the step file don't break at module load.
sub_header = "css=div.cust-confirm app-cust-top-nav"
share_button = "css=div.cust-confirm app-cust-top-nav"  # vanished — kept for import compat

# Main content area.
success_main = "css=div.cust-confirm main.confirm-main"
sparkle_disc = "css=div.cust-confirm .check-disc"        # was .sparkle-disc → .check-disc
eyebrow = "css=div.cust-confirm .eyebrow"
title = "css=div.cust-confirm h1.headline"               # was h1.title → h1.headline
body = "css=div.cust-confirm p.sub"                      # was p.body → p.sub

# The single details card (was section.summary-card).
summary_card = "css=div.cust-confirm .card"
summary_row = "css=div.cust-confirm .card .fact"
summary_label = "css=div.cust-confirm .card .fact-k"
summary_value = "css=div.cust-confirm .card .fact-v"

# Confirmation code is a .fact in the .facts grid; copy via .ref-copy button.
# No .conf-chip wrapper; kept variable names for import compat.
conf_chip = "css=div.cust-confirm .card .facts"          # was .conf-chip → facts grid
conf_code = "css=div.cust-confirm .card .fact-v.mono"    # was code.conf-code → .fact-v.mono
conf_copy_button = "css=div.cust-confirm button.ref-copy"

# Actions row: secondary buttons (calendar / directions / message) + primary (Done).
view_my_bookings_button = "css=div.cust-confirm .actions button.btn--primary"
# view_booking_button and back_to_home_button no longer exist in this design.
view_booking_button = "css=div.cust-confirm .actions button.btn--secondary >> nth=0"
back_to_home_button = "css=div.cust-confirm .actions button.btn--secondary >> nth=1"

# No bottom nav in redesigned desktop layout.
bottom_nav = "css=div.cust-confirm .actions"             # was nav.bottom-nav → actions bar
