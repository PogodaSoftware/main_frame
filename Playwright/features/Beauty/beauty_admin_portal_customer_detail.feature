Feature: Beauty Admin Portal — Customer detail (desktop)
  As a Beauty admin
  I want a real account detail with inline tagging and notes
  So that I can act on an account without leaving the page.

  Background:
    Given I am signed in as a Beauty admin viewing a test customer's detail

  Scenario: The detail loads with the customer's real identity and lifetime stats
    Then the page should show the customer's name and email
    And the lifetime stats should be visible

  Scenario: Assigning a suggested tag persists and shows in place (RN parity)
    When I click a suggested tag
    Then a tag assignment row should exist for that customer
    And the tag should appear as attached without a page reload

  Scenario: Adding an internal note persists and renders
    When I add an internal note
    Then the note should exist in the database
    And the note should appear in the notes list

  Scenario: The detail view exposes the section tabs and switches panels
    Then the Overview, Bookings, Payments, Reviews, Risk, Notes and Audit tabs should show
    When I click the Risk tab
    Then the Risk signals panel should show

  Scenario: The full tag picker exposes more tags than the suggested capped list
    When I open the tag picker
    Then the picker panel should be visible
    And the picker should list more available tags than the suggested cap

  Scenario: Searching in the tag picker filters to the seeded tag
    When I open the tag picker
    And I type the seeded tag label fragment into the picker search
    Then the seeded tag should appear in the picker results

  Scenario: Picking a tag from the full picker attaches it and closes the picker
    When I open the tag picker
    And I click the seeded tag in the picker
    Then the picker should be closed
    And the seeded tag should appear as an attached chip
