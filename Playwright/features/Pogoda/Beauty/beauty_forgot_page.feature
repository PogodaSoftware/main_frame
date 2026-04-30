Feature: Beauty Forgot Password Page Validation

  Scenario: Verify forgot password page elements
    Given I navigate to the beauty forgot page
    Then the beauty forgot page should be visible
    And the forgot back button should be visible
    And the forgot title should be visible
    And the forgot email input should be visible
    And the forgot submit button should be visible
    And the forgot info card should be visible
    And the forgot back to sign in link should be visible

  Scenario: Submit button is disabled for invalid email
    Given I navigate to the beauty forgot page
    When I type an invalid email into the forgot field
    Then the forgot submit button should be disabled

  Scenario: Submit button is enabled for valid email
    Given I navigate to the beauty forgot page
    When I type a valid email into the forgot field
    Then the forgot submit button should be enabled
