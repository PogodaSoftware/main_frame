"""Selectors for the Beauty Admin Portal — Provider detail (`/admin/portal/crm/provider/:id`)."""

pd_root = "app-admin-portal-provider-detail .aw-shell"
pd_name = "app-admin-portal-provider-detail .aw-id-name"
pd_perf = "app-admin-portal-provider-detail .aw-stat"
pd_tabs = "app-admin-portal-provider-detail .awph-tab"
pd_right_h3 = "app-admin-portal-provider-detail .aw-rightcol .aw-h3"
pd_suggested = "app-admin-portal-provider-detail .aw-tsug"
pd_attached = "app-admin-portal-provider-detail .aw-tchip.is-btn"

# Full tag picker (available_tags — uncapped full catalog)
pd_tpick_toggle = "app-admin-portal-provider-detail button.aw-tpick-toggle"   # "+ Add tag" toggle
pd_tpicker      = "app-admin-portal-provider-detail .aw-tpicker"               # picker panel
pd_tpick_search = "app-admin-portal-provider-detail .aw-tpick-search"          # search input
pd_tpick_item   = "app-admin-portal-provider-detail .aw-tpick-item"            # chip per available tag
# Suggested chips excluding the "+ Add tag" toggle (pure .aw-tsug, not .aw-tpick-toggle)
pd_tsug_only    = "app-admin-portal-provider-detail .aw-tsug:not(.aw-tpick-toggle)"

# In-app messaging
pd_msg_btn = "app-admin-portal-provider-detail .aw-hactions button:has-text('In-app message')"
pd_msg_composer = "app-admin-portal-provider-detail .aw-composer"
pd_msg_ta = "app-admin-portal-provider-detail .aw-composer .aw-ta"
pd_msg_send = "app-admin-portal-provider-detail .aw-composer-actions .aw-btn--pri"
pd_msg_sent = "app-admin-portal-provider-detail [role='status']"
