"""Selectors for the Beauty Admin Portal — Customer detail
(`/admin/portal/crm/customer/:id`)."""

cd_root = "app-admin-portal-customer-detail .aw-shell"
cd_name = "app-admin-portal-customer-detail .aw-id-name"
cd_lifetime = "app-admin-portal-customer-detail .aw-stat"

cd_attached = "app-admin-portal-customer-detail .aw-tchip.is-btn"   # attached tag (click → unassign)
cd_suggested = "app-admin-portal-customer-detail .aw-tsug"          # suggested tag (click → assign)

# Full tag picker (available_tags — uncapped full catalog)
cd_tpick_toggle = "app-admin-portal-customer-detail button.aw-tpick-toggle"   # "+ Add tag" toggle
cd_tpicker      = "app-admin-portal-customer-detail .aw-tpicker"               # picker panel
cd_tpick_search = "app-admin-portal-customer-detail .aw-tpick-search"          # search input
cd_tpick_item   = "app-admin-portal-customer-detail .aw-tpick-item"            # chip per available tag
# Suggested chips excluding the "+ Add tag" toggle (pure .aw-tsug, not .aw-tpick-toggle)
cd_tsug_only    = "app-admin-portal-customer-detail .aw-tsug:not(.aw-tpick-toggle)"

cd_addnote_btn = "app-admin-portal-customer-detail .aw-hactions button:has-text('Add note')"
cd_note_ta = "app-admin-portal-customer-detail .aw-composer .aw-ta"
cd_note_save = "app-admin-portal-customer-detail .aw-composer .aw-btn--pri"
cd_notes = "app-admin-portal-customer-detail .aw-note"

cd_tabs = "app-admin-portal-customer-detail .awph-tab"
cd_right_h3 = "app-admin-portal-customer-detail .aw-rightcol .aw-h3"

# In-app messaging
cd_msg_btn = "app-admin-portal-customer-detail .aw-hactions button:has-text('In-app message')"
cd_msg_composer = "app-admin-portal-customer-detail .aw-composer"
cd_msg_ta = "app-admin-portal-customer-detail .aw-composer .aw-ta"
cd_msg_send = "app-admin-portal-customer-detail .aw-composer-actions .aw-btn--pri"
cd_msg_sent = "app-admin-portal-customer-detail [role='status']"
