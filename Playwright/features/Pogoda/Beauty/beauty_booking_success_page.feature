Feature: Beauty Booking Success Page Validation

  Scenario: Authenticated customer sees the success page after booking
    Given an authenticated customer just confirmed a booking
    Then the beauty booking success page should be visible
    And the booking success share button should be visible
    And the booking success title should be visible
    And the booking success summary card should be visible
    And the booking success confirmation chip should be visible
    And the view my bookings button should be visible
    And the booking success bottom nav should be visible
