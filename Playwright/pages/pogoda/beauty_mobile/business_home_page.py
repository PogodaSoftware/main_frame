"""Page object for business home screen (/(business)/home)."""
from playwright.sync_api import Page

business_home_heading = "css=[data-testid='screen-heading'], h1, h2"
business_home_kpi_services = "css=[data-testid='kpi-services']"
business_home_logout_btn = "css=[data-testid='logout-btn'], :text('Sign out')"
business_home_add_service_cta = ":text('Add a service')"

# Bottom nav (BusinessBottomNav component).
business_bottom_nav = "css=[data-testid='business-bottom-nav']"
business_nav_home = "css=[data-testid='business-nav-home']"
business_nav_bookings = "css=[data-testid='business-nav-bookings']"
business_nav_services = "css=[data-testid='business-nav-services']"
business_nav_profile = "css=[data-testid='business-nav-profile']"
