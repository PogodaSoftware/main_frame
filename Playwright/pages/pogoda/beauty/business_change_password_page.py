"""Locators for the change-password screen."""

current_input = "css=[data-testid='current-password']"
new_input = "css=[data-testid='new-password']"
# Confirm field was added in the redesign — must match new_input or form rejects.
confirm_input = "css=[data-testid='confirm-password']"
# Submit button is now button.wbtn.wbtn-success inside the pw-shell form.
submit_btn = "css=div.pw-shell form button.wbtn.wbtn-success"
message = "css=[data-testid='change-password-msg']"
