Feature: Beauty Admin Portal — Audit log
  As a Beauty admin
  I want every admin action to be recorded in an immutable timeline
  So that a compliance review can reconstruct exactly who did what.

  Background:
    Given I am signed in as a Beauty admin

  Scenario: Empty audit log renders the empty state
    Given no admin actions have been performed yet
    When I open the admin portal audit page
    Then the audit page should render
    And the empty-state title "No events yet" should be visible

  Scenario: Recent admin actions appear in the timeline
    Given I have performed a "tag.create" action
    And I have performed an "account.suspend" action
    When I open the admin portal audit page
    Then the audit page should render
    And the most recent event row should reference the suspend action
    And the audit summary should report at least 2 events
