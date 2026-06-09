"""Locators for the RN forgot-password screen (`(auth)/forgot`).

Forgot is BFF-driven (resolves ``beauty_forgot``) and rendered through
``FormRenderer`` — so it reuses the same ``form-field-*`` / ``form-submit``
testIDs as login and signup.
"""

forgot_email = "css=[data-testid='form-field-email']"
forgot_submit = "css=[data-testid='form-submit']"
