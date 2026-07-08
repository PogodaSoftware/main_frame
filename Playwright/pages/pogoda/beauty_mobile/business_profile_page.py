"""Page object for business profile screen (/(business)/profile)."""
from playwright.sync_api import Page

profile_heading = ":text('Profile')"
profile_earnings_month = ":text('This month')"
profile_earnings_year = ":text('This year')"
profile_earnings_lifetime = ":text('Lifetime')"
profile_settings_link = ":text('Settings')"
