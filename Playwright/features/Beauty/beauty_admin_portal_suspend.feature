Feature: Beauty Admin Portal — Suspend confirm modal (desktop)
  As a Beauty admin
  I want a centered confirm dialog with a required, audited reason
  So that no account is suspended without an auditable explanation.

  Background:
    Given I am signed in as a Beauty admin viewing the suspend confirm for a test customer

  Scenario: The dialog opens with focus on the reason field (focus-trap)
    Then the reason field should hold focus

  Scenario: An empty reason blocks the suspend (no BFF call)
    When I clear the reason and click Yes, suspend
    Then a required-reason validation error should show
    And the customer should not be suspended in the database

  Scenario: A reasoned suspend persists, kills sessions, and writes an audit event
    When I click Yes, suspend with the default reason
    Then the customer should be suspended in the database
    And the customer's active sessions should be invalidated
    And an "account.suspend" audit event should be recorded
