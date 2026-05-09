Feature: Beauty Book Page Validation

  Scenario: Authenticated customer views the book page for a service
    Given an authenticated customer is on a service book page
    Then the beauty book page should be visible
    And the book sub-header title should be visible
    And the book hero should be visible
    And the book service title should be visible
    And at least one day chip should be visible
    And at least one time chip should be visible
    And the book provider card should be visible
    And the book confirm button should be visible
    And the book bottom nav should be visible

  Scenario: Confirm button enables after picking a day and time
    Given an authenticated customer is on a service book page
    When I select the first available day chip
    And I select the first available time chip
    Then the book confirm button should be enabled
