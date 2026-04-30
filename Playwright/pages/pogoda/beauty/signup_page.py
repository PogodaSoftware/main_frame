"""Locators for the customer signup page (`/pogoda/beauty/signup`).

Rendered by `BeautyDynamicFormComponent`. The signup resolver sets
`hide_top_header = True` and `show_back_bar = True`, so the brand-name
button is replaced by the back-bar.
"""

signup_page_root = "css=div.signup-page"

back_bar = "css=div.signup-page header.auth-back-bar"
back_bar_button = "css=div.signup-page header.auth-back-bar button.auth-back-btn"
brand_name_button = "css=div.signup-page button.brand-name-btn"

signup_title = "css=div.signup-page h1.signup-title"
name_input = "css=div.signup-page input#name"
email_input = "css=div.signup-page input#email"
password_input = "css=div.signup-page input#password"
password_toggle_button = "css=div.signup-page button.password-toggle"
submit_button = "css=div.signup-page button.btn-continue"
server_error = "css=div.signup-page div.server-error"
signin_link_button = "css=div.signup-page button.link-btn"

# Terms checkbox shown by the dynamic form when `show_terms_checkbox = True`.
# The visible square is now a decorative span; the real <input type="checkbox">
# is the one that carries focus + state, so click it directly.
terms_checkbox = "css=div.signup-page label.terms-row input.terms-input"
