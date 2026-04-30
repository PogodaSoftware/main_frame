Feature: Beauty Category Page Validation

  Scenario: Authenticated customer views the facial category page
    Given an authenticated customer is on the facial category page
    Then the beauty category page should be visible
    And the category hero should be visible
    And the category services title should be visible
    And at least one category service row should be visible
    And at least one category book button should be visible
    And the category bottom nav should be visible
