"""Locators for the RN business apply wizard (`(business)/apply/*`).

Shared chrome lives in ``WizardLayout`` and exposes:
   - wizard-brand-name      brand mark in header
   - wizard-step-counter    "Step N of 6"
   - wizard-step-title      H1 step title
   - wizard-step-<key>      step body wrapper (entity/services/stripe/...)
   - wizard-back            sticky back button
   - wizard-continue        sticky primary CTA
   - wizard-error           submit error text
"""

wizard_brand_name = "css=[data-testid='wizard-brand-name']"
wizard_step_counter = "css=[data-testid='wizard-step-counter']"
wizard_step_title = "css=[data-testid='wizard-step-title']"
wizard_back = "css=[data-testid='wizard-back']"
wizard_continue = "css=[data-testid='wizard-continue']"
wizard_error = "css=[data-testid='wizard-error']"


def wizard_step(key: str) -> str:
    return f"css=[data-testid='wizard-step-{key}']"


# Step 1 — entity
entity_type_card = "css=[data-testid='entity-type-card']"
entity_type_person = "css=[data-testid='entity-type-person']"
entity_type_business = "css=[data-testid='entity-type-business']"
entity_first_name = "css=[data-testid='entity-first-name']"
entity_last_name = "css=[data-testid='entity-last-name']"
entity_business_name = "css=[data-testid='entity-business-name']"
entity_addr1 = "css=[data-testid='entity-addr1']"
entity_addr2 = "css=[data-testid='entity-addr2']"
entity_city = "css=[data-testid='entity-city']"
entity_state = "css=[data-testid='entity-state']"
entity_postal = "css=[data-testid='entity-postal']"
entity_itin = "css=[data-testid='entity-itin']"


# Step 2 — services
services_options_card = "css=[data-testid='services-options-card']"


def services_option(value: str) -> str:
    return f"css=[data-testid='services-option-{value}']"


# Step 3 — stripe
stripe_card = "css=[data-testid='stripe-card']"
stripe_coming_soon = "css=[data-testid='stripe-coming-soon']"


# Step 4 — schedule
schedule_card = "css=[data-testid='schedule-card']"
schedule_help = "css=[data-testid='schedule-help']"


def schedule_row(dow: int) -> str:
    return f"css=[data-testid='schedule-row-{dow}']"


# Step 5 — tools
tools_card = "css=[data-testid='tools-card']"


def tools_option(value: str) -> str:
    return f"css=[data-testid='tools-option-{value}']"


# Step 6 — review
review_entity = "css=[data-testid='review-entity']"
review_services = "css=[data-testid='review-services']"
review_schedule = "css=[data-testid='review-schedule']"
review_tools = "css=[data-testid='review-tools']"
review_tos = "css=[data-testid='review-tos']"
review_tos_checkbox = "css=[data-testid='review-tos-checkbox']"
