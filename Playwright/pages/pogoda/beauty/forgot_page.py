"""Locators for the Beauty reset-password (forgot) page (`/pogoda/beauty/forgot`).

The component renders entirely inside CustAuthLayoutComponent → root div.cust-auth
(split-pane). There is no div.forgot-page wrapper. The "back to sign in" button
is a projected footer element rendered in div.cust-auth .foot. The title h1 is
rendered by the layout inside main.pane .pane-inner.
"""

# Root is the shared auth layout shell (no div.forgot-page in DOM).
forgot_page_root = "css=div.cust-auth"

# No header.back-bar; back link is in the cust-auth-footer slot (.foot).
back_bar = "css=div.cust-auth .foot"
back_button = "css=div.cust-auth .foot button.link"

# Brand block is in aside.hero (desktop) / .brand--mobile (mobile).
brand_block = "css=div.cust-auth aside.hero .brand"
brand_name = "css=div.cust-auth aside.hero .brand-name"

# Title + subtitle rendered by layout in .pane-inner.
title = "css=div.cust-auth .pane-inner h1.title"
subtitle = "css=div.cust-auth .pane-inner p.sub"

# Form elements — scoped to .pane .body (projected content area).
email_input = "css=div.cust-auth input#forgot-email"
field_error = "css=div.cust-auth span.field-error"
server_error = "css=div.cust-auth div.server-error"
success_message = "css=div.cust-auth div.success-msg"

submit_button = "css=div.cust-auth button.btn-submit"
info_card = "css=div.cust-auth .info-card"

# Back to sign in: projected into [cust-auth-footer] → rendered in .foot.
back_to_signin_link = "css=div.cust-auth .foot button.link"
