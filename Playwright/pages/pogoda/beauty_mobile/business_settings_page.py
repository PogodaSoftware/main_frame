"""Page objects for business settings screens."""
from playwright.sync_api import Page

# Settings hub
settings_heading = ":text('Settings')"


def settings_row(key: str) -> str:
    return f"css=[data-testid='settings-row-{key}']"


# Change password sub-screen
pw_field_current = "css=[data-testid='form-field-current_password']"
pw_field_new = "css=[data-testid='form-field-new_password']"
pw_field_confirm = "css=[data-testid='form-field-confirm_password']"
pw_submit = "css=[data-testid='form-submit']"

# Email & contact sub-screen
contact_field_public_email = "css=[data-testid='form-field-public_email']"
contact_field_phone = "css=[data-testid='form-field-contact_phone']"
contact_toggle_show_phone = "css=[data-testid='form-field-show_phone']"
contact_submit = "css=[data-testid='form-submit']"
