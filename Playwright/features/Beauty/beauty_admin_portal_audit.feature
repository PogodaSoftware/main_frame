Feature: Beauty Admin Portal — Audit log (desktop)
  As a Beauty admin
  I want a read-only audit log with action chips and actor search
  So that I can filter and review every admin action without page reloads.

  Background:
    Given I am signed in as a Beauty admin viewing the audit log

  Scenario: The audit table renders seeded rows on the desktop chrome
    Then the audit table should show the seeded actor rows

  Scenario: Clicking an action chip narrows the table to that action
    When I click the account.suspend action chip
    Then the visible row count matches the database count for account.suspend

  Scenario: Typing an actor email into the search narrows the table
    When I type the seeded actor email into the actor search
    Then every visible row shows the seeded actor email
    And the visible row count matches the seeded actor count

  Scenario: The reason column renders the seeded reason text
    When I type the seeded actor email into the actor search
    Then a row in the reason column shows the seeded reason text
