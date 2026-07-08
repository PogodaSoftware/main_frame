Feature: Beauty Admin Portal — Support tickets (desktop)
  As a Beauty admin
  I want a reactive desktop ticket queue with a composer and inline triage
  So that I can create, filter, assign, and update support tickets without phone-frame pages or reloads.

  Background:
    Given I am signed in as a Beauty admin viewing the support tickets

  Scenario: The queue renders the seeded ticket on the desktop chrome
    Then the tickets table should show the seeded ticket

  Scenario: Creating a ticket via the composer adds a real row
    When I create a ticket through the composer
    Then the new ticket appears in the queue and the database count grows by one

  Scenario: Assigning an unassigned ticket to me updates the row in place
    When I expand the unassigned seeded ticket and assign it to me
    Then the seeded ticket row shows my admin email
