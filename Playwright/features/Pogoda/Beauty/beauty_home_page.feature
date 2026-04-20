Feature: Beauty Home Page Validation

  Scenario: Verify home page elements for an unauthenticated visitor
    Given I navigate to the beauty home page
    Then the beauty home page should be visible
    And the beauty brand name button should be visible on the home page
    And the sign in button should be visible on the home page
    And the sign up button should be visible on the home page
    And the services section should be visible on the home page
    And the map section should be visible on the home page
