Feature: Beauty Login Page Validation

  Scenario: Verify login page elements are displayed
    Given I navigate to the beauty login page
    Then the beauty login page should be visible
    And the login title should display "Welcome back"
    And the login subtitle should display "Sign in to your account"
    And the login email input field should be visible
    And the login password input field should be visible
    And the login password toggle button should be visible
    And the sign in submit button should be visible
    And the sign up navigation link should be visible on the login page
    And the business login navigation link should be visible
