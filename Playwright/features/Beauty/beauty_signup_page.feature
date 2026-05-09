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
