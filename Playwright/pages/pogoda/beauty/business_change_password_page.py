"""Locators for the change-password screen."""

current_input = "css=[data-testid='current-password']"
new_input = "css=[data-testid='new-password']"
# app-prov-btn renders an inner <button class="prov-btn"> — data-testid is not forwarded.
# Target the submit button by its type within the change-password form.
submit_btn = "css=div.beauty-app.prov-shell form button[type='submit'].prov-btn"
message = "css=[data-testid='change-password-msg']"
