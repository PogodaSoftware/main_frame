"""Locators for /pogoda/beauty/business/services."""

services_root = "css=div.biz-app"
add_button = "css=button.btn-primary >> text=Add service"
service_row = "css=li.svc-row:has(strong:text-is('{name}'))"
edit_button = "css=li.svc-row:has(strong:text-is('{name}')) button:text-is('Edit')"
delete_button = "css=li.svc-row:has(strong:text-is('{name}')) button:text-is('Delete')"
confirm_delete_button = "css=button:has-text('Yes, delete')"

# Service form (add / edit)
service_name_input = "css=input#name"
service_category_select = "css=select#category"
service_description_input = "css=input#description"
service_price_input = "css=input#price_cents"
service_duration_input = "css=input#duration_minutes"
service_form_submit = "css=form.biz-form button[type='submit']"
