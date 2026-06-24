"""Locators for the business application wizard."""

shell_root = "css=div.wiz"
# Step counter is now span.wiz-step-counter.
step_counter = "css=div.wiz span.wiz-step-counter"
biz_title = "css=div.wiz h1.wiz-title"
server_error = "css=div.wiz p.server-error"

# Entity step — radio inputs are sr-only; click the wrapping label instead.
entity_radio_person = "css=label.legal-opt:has(input[value='person'])"
entity_radio_business = "css=label.legal-opt:has(input[value='business'])"
entity_itin_input = "css=input#itin"
entity_first_input = "css=input#first"
entity_last_input = "css=input#last"
entity_business_name_input = "css=input#biz-name"
# Footer Continue button — shared across all steps.
_footer_continue = "css=div.wiz footer button.wbtn.wbtn-green"
entity_submit = _footer_continue

# Services step — category buttons (not checkboxes) with data-category attribute.
service_checkbox = "css=button.cat-btn[data-category='{category}']"
services_submit = _footer_continue

# Stripe step
stripe_submit = _footer_continue

# Schedule step
schedule_submit = _footer_continue

# Tools step — checkboxes inside label.check-row[data-tool='{tool}'].
tool_checkbox = "css=label.check-row[data-tool='{tool}'] input[type='checkbox']"
tools_submit = _footer_continue

# Review step — TOS checkbox is sr-only; click the wrapping label instead.
tos_text = "css=div.wiz span.tos-text"
tos_checkbox = "css=label.tos-agree"
submit_application_button = _footer_continue
