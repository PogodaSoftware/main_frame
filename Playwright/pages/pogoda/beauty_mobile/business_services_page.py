"""Page object for business services list screen (/(business)/services)."""
from playwright.sync_api import Page

services_add_btn = "css=[data-testid='services-add-btn']"
services_empty_state = ":text('No services yet')"


def service_edit_btn(service_id: int) -> str:
    return f"css=[data-testid='service-edit-{service_id}']"


def service_delete_btn(service_id: int) -> str:
    return f"css=[data-testid='service-delete-{service_id}']"


# Service form (new / edit) — FormRenderer-style testIDs.
service_form_name = "css=[data-testid='form-field-name']"
service_form_description = "css=[data-testid='form-field-description']"
service_form_price = "css=[data-testid='form-field-price']"
service_form_duration = "css=[data-testid='form-field-duration']"
service_form_submit = "css=[data-testid='form-submit']"
