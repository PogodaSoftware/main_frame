"""Locators for the business application wizard."""

shell_root = "css=div.business-shell"
step_counter = "css=div.business-shell span.step-counter"
biz_title = "css=div.business-shell h1.biz-title"
server_error = "css=div.business-shell p.server-error"

# Entity step
entity_radio_person = "css=input[name='entity_type'][value='person']"
entity_radio_business = "css=input[name='entity_type'][value='business']"
entity_itin_input = "css=input#itin"
entity_first_input = "css=input#first"
entity_last_input = "css=input#last"
entity_business_name_input = "css=input#biz-name"
entity_submit = "css=div.business-shell[data-step='entity'] button[type='submit']"

# Services step
service_checkbox = "css=label.check-row[data-category='{category}'] input[type='checkbox']"
services_submit = "css=div.business-shell[data-step='services'] button[type='submit']"

# Stripe step
stripe_submit = "css=div.business-shell[data-step='stripe'] button[type='submit']"

# Schedule step
schedule_submit = "css=div.business-shell[data-step='schedule'] button[type='submit']"

# Tools step
tool_checkbox = "css=label.check-row[data-tool='{tool}'] input[type='checkbox']"
tools_submit = "css=div.business-shell[data-step='tools'] button[type='submit']"

# Review step
tos_text = "css=div.business-shell[data-step='review'] p.tos-text"
tos_checkbox = "css=div.business-shell[data-step='review'] input[name='accept_tos']"
submit_application_button = "css=div.business-shell[data-step='review'] button.submit-application"
