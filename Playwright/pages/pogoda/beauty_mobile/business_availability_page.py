"""Page object for business availability screen (/(business)/availability)."""
from playwright.sync_api import Page

availability_save_btn = "css=[data-testid='availability-save-btn']"
availability_heading = ":text('Weekly Hours')"
availability_success_banner = ":text('Hours saved')"
