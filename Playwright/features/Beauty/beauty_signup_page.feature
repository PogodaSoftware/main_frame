Feature: Beauty Sign Up Page Validation

  Scenario: Verify sign up page elements are displayed
    Given I navigate to the beauty signup page
    Then the beauty signup page should be visible
    And the signup title should display "Create account"
    And the signup email input field should be visible
    And the signup password input field should be visible
    And the signup password toggle button should be visible
    And the continue submit button should be visible
    And the sign in navigation link should be visible on the signup page

  # Responsive: mobile (390px) — no sideways scroll, full-width submit, 44px inputs.
  Scenario: Signup page is responsive on a mobile viewport
    Given I view the beauty signup page at a 390px mobile width
    Then the signup page should not scroll horizontally
    And the signup submit button should span the mobile content width
    And the signup inputs should be at least 44px tall
