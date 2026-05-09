Feature: Beauty Booking Detail Page Validation

  Scenario: Authenticated customer views their booking detail
    Given an authenticated customer has an upcoming booking and is viewing it
    Then the beauty booking detail page should be visible
    And the booking detail sub-header title should display "Booking"
    And the booking detail title should be visible
    And the booking detail info card should be visible
    And the booking detail cancel button should be visible
    And the booking detail bottom nav should be visible
