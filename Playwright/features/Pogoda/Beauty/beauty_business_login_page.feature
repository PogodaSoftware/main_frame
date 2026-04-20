Feature: Beauty Business Login Page Validation

  Scenario: Verify business login page elements are displayed
    Given I navigate to the beauty business login page
    Then the business login page should be visible
    And the business portal badge should be displayed
    And the business login title should display "Business Sign In"
    And the business login subtitle should display "Access your business provider account"
    And the business email input field should be visible
    And the business password input field should be visible
    And the business sign in submit button should be visible
    And the customer sign in navigation link should be visible
