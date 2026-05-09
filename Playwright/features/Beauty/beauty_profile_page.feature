Feature: Beauty Profile Page Validation

  Scenario: Authenticated customer sees their profile
    Given an authenticated customer is on the profile page
    Then the beauty profile page should be visible
    And the profile avatar block should be visible
    And the profile display name should be visible
    And the profile info card should be visible
    And the profile my bookings action should be visible
    And the profile sign out button should be visible
    And the profile bottom nav should be visible

  Scenario: Authenticated customer signs out from the profile page
    Given an authenticated customer is on the profile page
    When I click the profile sign out button
    Then I should land on the welcome page
    And the welcome sign in button should be visible on the welcome page
