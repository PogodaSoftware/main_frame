"""Locators for the Beauty welcome page (`/pogoda/beauty/welcome`).

Renders through CustAuthLayoutComponent → root div.cust-auth (split-pane).
Left aside.hero has the brand block; right main.pane has the projected stack
of social + email buttons. No div.welcome-page wrapper exists in the DOM.
"""

# Root (unchanged — already correct).
welcome_page_root = "css=div.cust-auth"

# Hero / brand block lives in aside.hero inside div.cust-auth.
# div.welcome-page never existed; fixed to actual DOM path.
hero = "css=div.cust-auth aside.hero"
brand_block = "css=div.cust-auth aside.hero .brand"
brand_name = "css=div.cust-auth aside.hero .brand-name"
brand_tag = "css=div.cust-auth aside.hero .pitch-title"  # no brand-tag; pitch-title is nearest equivalent

# Action buttons — data-testid attributes are stable and unchanged.
signin_button = "css=[data-testid='welcome-signin']"
signup_button = "css=[data-testid='welcome-signup']"
google_button = "css=[data-testid='welcome-google']"

# Misc — fixed from non-existent div.welcome-page scope.
divider = "css=div.cust-auth .pane .divider"
legal_text = "css=div.cust-auth .foot"                   # was .legal → footer slot .foot
