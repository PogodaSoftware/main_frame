"""Selectors for the Beauty Admin Portal — Feature Flags desktop page.

Desktop redesign selectors (shared admin-web chrome). Mirrors the vocabulary
of the audit/team/bookings-ledger page objects: .aw-shell root, .aw-flag-row
rows, .aw-toggle buttons, .aw-table tbody for the audit trail.
"""

# Root shell (confirms we're on the desktop chrome, not a phone fallback)
flags_root = "app-admin-portal-flags .aw-shell"

# Page header
flags_header_title = "app-admin-portal-flags .awph-title"
flags_header_sub   = "app-admin-portal-flags .awph-sub"

# Sidebar nav item
flags_sidebar_item = "app-admin-web-sidebar .aws-item[title='Feature flags']"

# Flag list card
flags_card        = "app-admin-portal-flags .aw-flags-card"
flags_rows        = "app-admin-portal-flags .aw-flag-row"
flags_toggle      = ".aw-toggle"          # relative to a flag row
flags_status_pill = ".aw-status-pill"     # relative to a flag row

# Audit table
flags_audit_table = "app-admin-portal-flags .aw-table"
flags_audit_rows  = "app-admin-portal-flags .aw-table tbody tr.aw-trow"
flags_audit_key   = ".c-flag"             # relative to an audit row
flags_audit_change = ".c-change"          # relative to an audit row
