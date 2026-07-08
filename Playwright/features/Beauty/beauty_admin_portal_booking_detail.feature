Feature: Beauty Admin Portal — Booking detail (desktop)
  As a Beauty admin
  I want the booking drill-down to be a real desktop page
  So that opening a booking from a customer does not drop me into a phone layout.

  Background:
    Given I am signed in as a Beauty admin opening a real booking

  Scenario: The booking detail renders on the desktop admin chrome
    Then the booking confirmation and status should show
    And both the customer and provider parties should show

  Scenario: The customer party deep-links to the admin customer detail
    When I click the customer party
    Then the admin customer detail should open
