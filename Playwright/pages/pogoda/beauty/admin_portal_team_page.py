"""Selectors for the Beauty Admin Portal — Team & access (`/admin/portal/team`).

Desktop redesign selectors (shared admin-web chrome). Prefer the stable
component CSS classes (`.aw-trow`, `.aw-drawer`, `.aw-rolechip`, …) over ARIA
labels that shift with copy edits.
"""

team_page_root = "app-admin-portal-team .aw-shell"
team_header_title = "app-admin-portal-team .awph-title"
team_summary = "app-admin-portal-team .awph-sub"

# Header actions
invite_button = "app-admin-portal-team .aw-hactions .aw-btn--pri"

# Admin roster rows (the matrix lives in a separate <table>, so scope to the trow)
admin_rows = "app-admin-portal-team .aw-trow"
admin_row_email = ".aw-id-email"
admin_row_role_pill = ".aw-rolepill"
admin_kebab = ".aw-kebab"

# Inline row drawer (role change + revoke)
admin_drawer = "app-admin-portal-team .aw-drawer"
admin_drawer_rolechip = "app-admin-portal-team .aw-drawer .aw-rolechip"
admin_drawer_save = "app-admin-portal-team .aw-drawer .aw-btn--pri"

# Invite composer
invite_email_input = "app-admin-portal-team #invite-email"
invite_role_chip = "app-admin-portal-team .aw-composer-panel .aw-rolechip"

# Pending invite rows
invite_rows = "app-admin-portal-team .aw-invite-row"
invite_row_email = ".aw-id-name"

# Permission matrix
matrix_root = "app-admin-portal-team .aw-matrix"
matrix_row = "app-admin-portal-team .aw-matrix tbody tr"
