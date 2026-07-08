"""Locators for the shared weekly-hours editor.

Used by the wizard schedule step (`/pogoda/beauty/business/apply/schedule`)
and the post-acceptance availability page (`/pogoda/beauty/business/availability`).
Both screens host `<app-beauty-weekly-hours-editor>` so the same selectors apply.
"""

editor_root = "css=app-beauty-weekly-hours-editor"

# Quick-set chips
quickset_label = "css=app-beauty-weekly-hours-editor div.qs-label"
quickset_chip_all = "css=app-beauty-weekly-hours-editor button.qs-chip"
quickset_chip_by_text = (
    "css=app-beauty-weekly-hours-editor button.qs-chip:has-text(\"{label}\")"
)

# Hours card + day rows
hours_card = "css=app-beauty-weekly-hours-editor app-prov-card.hours-card"
day_rows = "css=app-beauty-weekly-hours-editor div.day-row"
day_row_nth = "css=app-beauty-weekly-hours-editor div.day-row >> nth={index}"
day_name_nth = (
    "css=app-beauty-weekly-hours-editor div.day-row:nth-of-type({n}) div.day-name"
)
day_sub_nth = (
    "css=app-beauty-weekly-hours-editor div.day-row:nth-of-type({n}) div.day-sub"
)

# Segmented pill — buttons are ordered Closed | Open | 24h
seg_closed_nth = (
    "css=app-beauty-weekly-hours-editor div.day-row:nth-of-type({n}) "
    "div.seg-pill button.seg:nth-of-type(1)"
)
seg_open_nth = (
    "css=app-beauty-weekly-hours-editor div.day-row:nth-of-type({n}) "
    "div.seg-pill button.seg:nth-of-type(2)"
)
seg_24h_nth = (
    "css=app-beauty-weekly-hours-editor div.day-row:nth-of-type({n}) "
    "div.seg-pill button.seg:nth-of-type(3)"
)

# Time pair (visible only when state === open)
time_pair_nth = (
    "css=app-beauty-weekly-hours-editor div.day-row:nth-of-type({n}) div.time-pair"
)
time_start_nth = (
    "css=app-beauty-weekly-hours-editor div.day-row:nth-of-type({n}) "
    "div.time-pair input.time-input:nth-of-type(1)"
)
time_end_nth = (
    "css=app-beauty-weekly-hours-editor div.day-row:nth-of-type({n}) "
    "div.time-pair input.time-input:nth-of-type(2)"
)

# TZ banner — present on the wizard schedule step (hideTzBanner=false, default).
# NOT present on the availability page (hideTzBanner=true there).
tz_banner = "css=app-beauty-weekly-hours-editor div.tz-banner"

# TZ rail card — present on the availability page (right-rail aside).
# The availability page hides the inline tz-banner and shows a right-rail card
# instead. Scoped to the "Time zone" eyebrow specifically (there are 2 rail-eyebrow
# elements on the page; the other is "Upcoming overrides").
tz_rail_card = "css=app-beauty-business-availability div.rail-eyebrow:has-text('Time zone')"

# Legacy locators that should NO LONGER be present in either screen.
# Kept here so the test can assert they are absent (regression guard).
legacy_closed_checkbox = (
    "css=label.closed-toggle input[type='checkbox'][name^='closed-']"
)
