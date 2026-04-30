"""Locators for the Beauty book page (`/pogoda/beauty/book/:serviceId`)."""

book_page_root = "css=div.beauty-app"

sub_header = "css=div.beauty-app header.sub-header"
sub_header_title = "css=div.beauty-app header.sub-header span.sub-header-title"
back_button = "css=div.beauty-app header.sub-header button.back-btn"

hero = "css=div.beauty-app section.hero-stripe"
detail_section = "css=div.beauty-app section.detail-section"
title = "css=div.beauty-app section.detail-section h1.title"
price = "css=div.beauty-app section.detail-section .price"
meta_line = "css=div.beauty-app section.detail-section .meta"

# Day chips and time chips.
section_label = "css=div.beauty-app section.detail-section .section-label"
day_row = "css=div.beauty-app .day-row"
# .day-chip is now a calendar grid cell. The grid renders past days
# disabled and out-of-month padding cells without slots — so we
# explicitly target enabled cells (ones that actually have slots).
day_chip = "css=div.beauty-app button.day-chip:not(:disabled):not(.is-disabled)"
day_chip_first = "css=div.beauty-app button.day-chip:not(:disabled):not(.is-disabled) >> nth=0"
day_chip_selected = "css=div.beauty-app button.day-chip.is-selected"

time_grid = "css=div.beauty-app .time-grid"
time_chip = "css=div.beauty-app button.time-chip"
time_chip_first = "css=div.beauty-app button.time-chip >> nth=0"
time_chip_selected = "css=div.beauty-app button.time-chip.is-selected"
time_empty = "css=div.beauty-app .time-empty"

# Provider card.
provider_card = "css=div.beauty-app .provider-card"
provider_name = "css=div.beauty-app .provider-card .provider-name"
provider_change_button = "css=div.beauty-app .provider-card button.provider-change"

server_error = "css=div.beauty-app section.detail-section p.server-error"

cta_row = "css=div.beauty-app .cta-row"
confirm_button = "css=div.beauty-app .cta-row button.btn-confirm"

bottom_nav = "css=div.beauty-app nav.bottom-nav"
