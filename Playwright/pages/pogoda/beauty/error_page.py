"""Locators for the Beauty error pages: generic, not-found, offline, and the
catch-all wildcard route.

All variants share the same `BeautyErrorComponent` template; only the copy
text and embedded SVG differ.
"""

error_page_root = "css=div.error-page"

sub_header = "css=div.error-page header.sub-header"
sub_header_title = "css=div.error-page header.sub-header span.sub-header-title"
back_button = "css=div.error-page header.sub-header button.back-btn"

# Sparkle disc + icon.
sparkle = "css=div.error-page .err-sparkle"
sparkle_ring = "css=div.error-page .err-sparkle-ring"

# Copy.
eyebrow = "css=div.error-page .err-eyebrow"
title = "css=div.error-page h1.err-title"
body = "css=div.error-page p.err-body"
code = "css=div.error-page code.err-code"

# Action buttons (Try again, Go home, Contact support).
try_again_button = "css=div.error-page .err-actions button.btn-secondary"
go_home_button = "css=div.error-page .err-actions button.btn-primary"
contact_support_link = "css=div.error-page button.btn-link"
