"""Locators for the Beauty book page (`/pogoda/beauty/book/:serviceId`).

Root is now ``div.cust-book`` (was ``div.beauty-app``).
Layout: CustTopNav at top, then breadcrumb (.crumb), h1.title, .subtitle,
two-column .grid — left: .card.svc-card + .card.picker; right: .card.checkout.
No sub-header, no hero-stripe, no provider-card, no bottom-nav.
"""

book_page_root = "css=div.cust-book"

# ── Breadcrumb / title ────────────────────────────────────────────────────────
# Was: header.sub-header span.sub-header-title  →  no sub-header in new layout.
# The current service name appears as h1.title AND as .crumb-current.
# Mapped to .crumb-current so the step assertion ("sub-header title visible")
# stays meaningful without a sub-header element.
sub_header_title = "css=div.cust-book .crumb-current"   # service name in breadcrumb
back_button      = "css=div.cust-book button.crumb-link" # navigates back to provider

# Service title (h1)
title = "css=div.cust-book h1.title"

# Subtitle: was .meta / section.detail-section .meta  →  now .subtitle
meta_line = "css=div.cust-book .subtitle"

# ── Service card ──────────────────────────────────────────────────────────────
# Was: section.hero-stripe  →  no hero-stripe; service info in .card.svc-card.
# Kept `hero` alias pointing at the service card so existing step import resolves.
hero = "css=div.cust-book .card.svc-card"

# Individual service-card fields
svc_name        = "css=div.cust-book .svc-name"
svc_cat         = "css=div.cust-book .svc-cat"
svc_desc        = "css=div.cust-book .svc-desc"
svc_price       = "css=div.cust-book .svc-price"    # not in new svc-card; price in checkout
service_price   = "css=div.cust-book .rev-total-v"  # total price in checkout card

# ── Day / time picker (.card.picker) ─────────────────────────────────────────
# Was: .day-row  →  now .day-grid (inside .card.picker)
day_row   = "css=div.cust-book .day-grid"            # alias — .day-row removed

# Was: button.day-chip  →  now button.day
# Enabled day button: was `button.day-chip:not(:disabled):not(.is-disabled)`
day_chip          = "css=div.cust-book button.day:not(:disabled)"
day_chip_first    = "css=div.cust-book button.day:not(:disabled) >> nth=0"
day_chip_selected = "css=div.cust-book button.day.is-selected"

# Was: .time-grid / button.time-chip  →  .time-grid preserved, button class is .time
time_grid         = "css=div.cust-book .time-grid"
time_chip         = "css=div.cust-book button.time"
time_chip_first   = "css=div.cust-book button.time >> nth=0"
time_chip_selected = "css=div.cust-book button.time.is-selected"

# Was: .time-empty  →  no-times state uses class .empty (inside ng-template #noTimes)
time_empty = "css=div.cust-book .time-grid ~ .empty"

# Picker section label (was .section-label  →  now .picker-title)
section_label = "css=div.cust-book .picker-title"

# ── Checkout / review card ────────────────────────────────────────────────────
# Was: .provider-card  →  no provider-card; provider info is in .checkout .rev-rows.
# Mapped to the checkout card so the step assertion ("provider card visible") holds.
provider_card  = "css=div.cust-book .checkout"
provider_name  = "css=div.cust-book .rev-v"   # first .rev-v is service name; second is provider

# Was: .cta-row button.btn-confirm  →  confirm is now a direct child of .checkout
# .cta-row does not exist in the new template.
cta_row        = "css=div.cust-book .checkout"  # alias — .cta-row removed
confirm_button = "css=div.cust-book button.btn-confirm"

# Error
server_error = "css=div.cust-book p.server-error"

# Cancel note
cancel_note = "css=div.cust-book .cancel-note"

# ── Removed elements (documented; do not use in new tests) ────────────────────
# sub_header       — was header.sub-header; not present; use breadcrumb .crumb.
# hero (hero-stripe) — was section.hero-stripe; mapped above to .card.svc-card.
# detail_section   — was section.detail-section; structure is now .book-inner.
# price            — was .price; price now in .svc-meta .mono or .rev-total-v.
# provider_card    — was .provider-card; provider info now in checkout .rev-rows.
# provider_change_button — removed; no provider change in current design.
# bottom_nav       — was nav.bottom-nav; component uses CustTopNav at top.

# ── Top nav (replaces bottom_nav) ─────────────────────────────────────────────
top_nav    = "css=div.cust-book app-cust-top-nav"
bottom_nav = "css=div.cust-book app-cust-top-nav"   # alias for removed bottom-nav
