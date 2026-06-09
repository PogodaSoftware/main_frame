"""Selectors for the Beauty Admin Portal — Team page (`/admin/portal/team`).

Kept minimal and stable: prefer CSS classes the component already ships
(`.adm-team`, `.row`, `.role-pill`, etc.) rather than reaching for ARIA
labels that may shift across copy edits.
"""

team_page_root = "app-admin-portal-team .adm-team"
team_header_title = "app-admin-portal-team .sub .title"
team_summary = "app-admin-portal-team .sub .summary"
invite_button = "app-admin-portal-team button.new-btn"

# Admin roster rows
admin_rows = "app-admin-portal-team main .row:not(.invite-row)"
admin_row_name = ".row-text .r-name"
admin_row_email = ".row-text .r-email"
admin_row_role_pill = ".row-text .role-pill"
admin_kebab = ".kebab"
admin_menu = ".menu"
admin_menu_role_select = ".menu select"
admin_menu_save = ".menu button.mb:not(.danger)"
admin_menu_revoke = ".menu button.mb.danger"

# Pending invite rows
invite_rows = "app-admin-portal-team main .row.invite-row"
invite_row_email = ".row-text .r-name"

# Invite composer
invite_email_input = "app-admin-portal-team .invite-wrap input.ti"
invite_role_chip = "app-admin-portal-team .role-chips .role-chip"
invite_send_button = "app-admin-portal-team .invite-wrap adm-btn[variant='primary'] button"

# Permission matrix
matrix_root = "app-admin-portal-team .matrix-wrap"
matrix_row = "app-admin-portal-team .matrix-wrap .m-row"

# Tab bar
tab_bar = "app-admin-portal-team adm-tab-bar"
