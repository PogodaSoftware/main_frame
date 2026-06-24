"""Selectors for the Beauty Admin Portal — Audit log (`/admin/portal/audit`).

Desktop redesign selectors (shared admin-web chrome). Mirrors the vocabulary
of the tickets/team/bookings-ledger page objects: .aw-shell root, .aw-trow
rows, .aw-chip action filter chips, .awph-title/.awph-sub page header.
"""

# Root shell (confirms we're on the desktop chrome, not a phone fallback)
audit_root = "app-admin-portal-audit .aw-shell"

# Page header
audit_header_title = "app-admin-portal-audit .awph-title"
audit_header_sub = "app-admin-portal-audit .awph-sub"

# Filter bar
audit_actor_input = "app-admin-portal-audit .aw-filterbar input"
audit_chips = "app-admin-portal-audit .aw-filterbar .aw-chip"

# Table rows (data rows only; header <tr> is inside <thead> not <tbody>)
audit_rows = "app-admin-portal-audit .aw-table tbody tr.aw-trow"

# Per-row column cells (scope these relative to a row locator)
audit_cell_who = ".c-who .aw-who-email"
audit_cell_action = ".c-action .aw-actcode"
audit_cell_reason = ".c-reason"
