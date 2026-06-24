"""Locators for the Beauty profile page (`/pogoda/beauty/profile`).

The profile page uses CustTopNavComponent (desktop top-nav) and renders
a two-column grid with an identity card on the left and settings groups
on the right.  There is NO bottom-nav and NO profile-saved-link testid —
customers reach Saved via the "Saved" button in the top nav.

Root class: div.cust-profile
"""

# Page root
profile_page_root = "css=div.cust-profile"

# Top nav (CustTopNavComponent)
top_nav = "css=div.cust-profile header.cust-topnav"
top_nav_saved_btn = "css=div.cust-profile header.cust-topnav button.nav-item:has-text('Saved')"
top_nav_bookings_btn = "css=div.cust-profile header.cust-topnav button.nav-item:has-text('My bookings')"
top_nav_messages_btn = "css=div.cust-profile header.cust-topnav button.nav-item:has-text('Messages')"
top_nav_discover_btn = "css=div.cust-profile header.cust-topnav button.nav-item:has-text('Discover')"

# Identity card (left column)
identity_card = "css=div.cust-profile .card.identity"
avatar = "css=div.cust-profile .id-head .avatar"
display_name = "css=div.cust-profile .id-name"
email_mono = "css=div.cust-profile .id-email"
member_badge = "css=div.cust-profile .member-badge"
stats_block = "css=div.cust-profile .stats"

# Settings rows (right column)
settings_panel = "css=div.cust-profile .settings"
sign_out_button = "css=div.cust-profile button.srow--btn"

# ── Legacy aliases kept for backward-compat with test_beauty_profile_page.py ──
# The new profile page has no avatar-block, info-card, action-card or bottom-nav.
# Map the old names to the nearest real selectors so existing tests keep compiling
# (the feature file scenarios are updated separately).
avatar_block   = identity_card
info_card      = settings_panel
my_bookings_action = top_nav_bookings_btn
bottom_nav     = top_nav

# "Saved Services" is reached via the top-nav "Saved" button — there is no
# profile-saved-link testid on this page.
saved_services_link = top_nav_saved_btn

# Sub-header / back-button do not exist on the redesigned profile.
sub_header  = profile_page_root
back_button = profile_page_root
