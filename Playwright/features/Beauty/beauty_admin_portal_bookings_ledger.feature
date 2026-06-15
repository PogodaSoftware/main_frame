Feature: Beauty Admin Portal — Bookings ledger (desktop)
  As a Beauty admin
  I want a reactive desktop ledger with real status filters
  So that I can browse bookings and drill in without phone-frame pages or reloads.

  Background:
    Given I am signed in as a Beauty admin viewing the bookings ledger

  Scenario: The ledger renders real rows on the desktop chrome
    Then the ledger should show booking rows

  Scenario: The Cancelled status chip narrows to the real cancelled count
    When I click the "Cancelled" status chip
    Then the visible rows should equal the real cancelled-booking count

  Scenario: A row opens the desktop booking detail and Back returns to the desktop ledger
    When I click the first booking row
    Then the desktop booking detail should open
    When I click Back to bookings
    Then the desktop bookings ledger should show
