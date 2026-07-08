Feature: Beauty Business Sign Up Page

  Scenario: Verify business signup page elements are displayed
    Given I navigate to the beauty business signup page
    Then the business signup page should be visible
    And the business signup title should display "Create business account"
    And the business signup business name input should be visible
    And the business signup email input should be visible
    And the business signup password input should be visible
    And the business signup submit button should be visible
    And the business signup login link should be visible
