"""Page object for business service add/edit form (/(business)/services/[id])."""
from playwright.sync_api import Page

service_form_name = "css=[data-testid='form-field-name']"
service_form_description = "css=[data-testid='form-field-description']"
service_form_price = "css=[data-testid='form-field-price']"
service_form_duration = "css=[data-testid='form-field-duration']"
service_form_submit = "css=[data-testid='form-submit']"
