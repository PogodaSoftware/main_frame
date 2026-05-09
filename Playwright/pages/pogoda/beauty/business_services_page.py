"""Locators for /pogoda/beauty/business/services."""

services_root = "css=div.beauty-app.prov-shell"
add_button = "css=app-prov-btn >> text=Add service"
service_row = "css=div.svc-row:has(div.svc-name:text-is('{name}'))"
edit_button = "css=div.svc-row:has(div.svc-name:text-is('{name}')) app-prov-btn >> text=Edit"
delete_button = "css=div.svc-row:has(div.svc-name:text-is('{name}')) app-prov-btn >> text=Delete"
confirm_delete_button = "css=button.beauty-modal-btn.primary >> text=Yes, delete"

# Service form (add / edit)
service_name_input = "css=input#name"
service_category_select = "css=select#category"
service_description_input = "css=input#description"
service_price_input = "css=input#price_dollars"
service_duration_input = "css=input#duration_minutes"
service_form_submit = "css=form.biz-form button[type='submit']"
