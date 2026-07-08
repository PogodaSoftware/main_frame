"""Locators for /pogoda/beauty/business/services."""

services_root = "css=div.pw-shell"
# Add service button — header action button on the list page.
add_button = "css=div.pw-shell button.wbtn.wbtn-ink:text('Add service')"
# Service rows are <tr> elements in the svc-table; match by svc-name div text.
service_row = "css=tr:has(div.svc-name:text-is('{name}'))"
edit_button = "css=tr:has(div.svc-name:text-is('{name}')) button.wbtn.wbtn-secondary"
delete_button = "css=tr:has(div.svc-name:text-is('{name}')) button.wbtn.wbtn-danger-outline"
confirm_delete_button = "css=button.beauty-modal-btn.primary"

# Service form (add / edit) — navigates to /services/new/edit or /services/{id}/edit
service_name_input = "css=input#svc-name"
service_category_select = "css=select#svc-category"
service_description_input = "css=textarea#svc-description"
service_price_input = "css=input#svc-price"
service_duration_input = "css=input#svc-duration"
service_form_submit = "css=button.wbtn.wbtn-success"
