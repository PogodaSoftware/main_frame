Feature: Beauty Home Page Validation

  Scenario: Unauthenticated visitor is redirected to the welcome screen
    Given I navigate to the beauty home page as guest
    Then the welcome page should be visible

  Scenario: Authenticated customer sees the home services and bottom nav
    Given an authenticated customer is on the beauty home page
    Then the beauty home page should be visible
    And the services section should be visible on the home page
    And the map section should be visible on the home page
    And the bottom nav should be visible on the home page
