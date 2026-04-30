"""Locators for the customer login page (`/pogoda/beauty/login`).

The page is now rendered by `BeautyDynamicFormComponent`; the BFF resolver
sets `presentation.page_class = 'login-page'` and `hide_top_header = True`
plus `show_back_bar = True` and `show_forgot_link = True`, so the brand-name
button is hidden behind the back-bar back button.
"""

login_page_root = "css=div.login-page:not(.business-login-page)"

# Back-bar (replaces the legacy top header on login). The brand button
# locator stays defined so older flows can still target it if a future
# resolver flips `hide_top_header` back off.
back_bar = "css=.login-page:not(.business-login-page) header.auth-back-bar"
back_bar_button = "css=.login-page:not(.business-login-page) header.auth-back-bar button.auth-back-btn"
brand_name_button = "css=.login-page:not(.business-login-page) button.brand-name-btn"

# Static page text.
login_title = "css=.login-page:not(.business-login-page) h1.login-title"
login_subtitle = "css=.login-page:not(.business-login-page) p.login-subtitle"

# Form inputs.
email_input = "css=.login-page:not(.business-login-page) input#email"
password_input = "css=.login-page:not(.business-login-page) input#password"
password_toggle_button = "css=.login-page:not(.business-login-page) button.password-toggle"
submit_button = "css=.login-page:not(.business-login-page) button.btn-login[type='submit']"
server_error = "css=.login-page:not(.business-login-page) div.server-error"

# Footer links rendered by the dynamic form.
signup_link_button = "css=.login-page:not(.business-login-page) button.link-signup"
business_login_link_button = "css=.login-page:not(.business-login-page) button.link-business"
forgot_link = "css=.login-page:not(.business-login-page) button.forgot-link"
