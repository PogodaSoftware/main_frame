Feature: Beauty End-to-End Booking Flow

  Scenario: Customer can browse a category, book a service, and see it in their list
    Given a fresh authenticated customer is on the beauty home page
    When I tap the first category card on the home page
    And I tap the first book button on the category page
    And I select the first available day chip
    And I select the first available time chip
    And I click the confirm booking button
    Then I should land on the booking success page
    And the booking success summary should mention the chosen service
    When I click the view my bookings button
    Then I should land on the bookings list page
    And the new booking should be visible in the list
    When I tap the first booking in the list
    Then the booking detail page should be visible
    And the booking detail cancel button should be visible
