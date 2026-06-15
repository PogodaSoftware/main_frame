"""Selectors for the Beauty Admin Portal — Auth screens.

Covers the four slate split-pane auth artboards:
`/admin/portal/{signin,2fa,magic,ip-warning}`.
"""

# --- Sign-in (web-auth-signin) ---------------------------------------------
signin_root = "app-admin-portal-signin .aw-card"
signin_title = "app-admin-portal-signin .aw-h2"
signin_email = "#adm-signin-email"
signin_password = "#adm-signin-pw"
signin_submit = "app-admin-portal-signin button[type='submit']"
signin_magic_link = "app-admin-portal-signin a.aw-link"
signin_error = "app-admin-portal-signin .aw-err"

# --- 2FA (web-auth-2fa) ----------------------------------------------------
twofa_root = "app-admin-portal-2fa .aw-card"
twofa_title = "app-admin-portal-2fa .aw-h2"

# --- Magic link (web-auth-magic) -------------------------------------------
magic_root = "app-admin-portal-magic .aw-card"
magic_title = "app-admin-portal-magic .aw-h2"
magic_email = "#adm-magic-email"
magic_send = "app-admin-portal-magic button.aw-primary"
magic_success_card = "app-admin-portal-magic .success-card"

# --- IP warning (web-auth-ip) ----------------------------------------------
ip_root = "app-admin-portal-ip-warning .aw-card"
ip_alert = "app-admin-portal-ip-warning .alert"
