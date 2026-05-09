Feature: Beauty Bookings List Page Validation

  Scenario: Authenticated customer with no bookings sees empty state
    Given an authenticated customer is on the bookings list page
    Then the beauty bookings list page should be visible
    And the bookings page title should be visible
    And the bookings segmented tabs should be visible
    And the bookings empty state should be visible
    And the bookings bottom nav should be visible
