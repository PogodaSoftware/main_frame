"""Selectors for the Beauty Admin Portal — CRM list (`/admin/portal/crm`)."""

crm_root = "app-admin-portal-crm-list .aw-shell"
crm_title = "app-admin-web-page-header .awph-title"
crm_search = "app-admin-portal-crm-list .aw-search input"
crm_result_count = "app-admin-portal-crm-list .aw-resultrow .mono"

crm_rows = "app-admin-portal-crm-list .aw-trow"
row_status_chip = ".c-status .aw-schip"
row_checkbox = ".c-cb input"

status_chips = "app-admin-portal-crm-list .aw-filter > button.aw-chip"
bulk_bar = "app-admin-portal-crm-list .aw-bulkbar"
bulk_suspend = "app-admin-portal-crm-list .aw-bulkbar button.is-danger"

# Header actions area (slot="actions" div)
hactions = "app-admin-portal-crm-list .aw-hactions"
# Tight selector: button inside .aw-hactions whose *exact* visible text is "Add tag".
# Uses :has-text which is substring — we restrict further in the step with `exact=True`.
hactions_add_tag = "app-admin-portal-crm-list .aw-hactions button"
manage_tags_btn = "app-admin-portal-crm-list .aw-hactions button.aw-btn"

# Tab strip inside the page-header
crm_tabs = "app-admin-portal-crm-list app-admin-web-page-header .awph-tab"
