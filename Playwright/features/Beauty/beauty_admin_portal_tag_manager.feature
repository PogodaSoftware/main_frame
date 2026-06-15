Feature: Beauty Admin Portal — Tag manager (desktop)
  As a Beauty admin
  I want to create CRM tags from a real desktop table
  So that the new tag persists to the database, is audited, and shows in place.

  Background:
    Given I am signed in as a Beauty admin viewing the tag manager

  Scenario: The table lists every real custom tag
    Then the table count should equal the real BeautyAdminTag row count

  Scenario: Creating a tag persists a row, writes an audit event, and refreshes in place
    When I type a new tag name and click Create tag
    Then a BeautyAdminTag row for that name should exist
    And a "tag.create" audit event should be recorded
    And the new tag should appear in the table without a page reload

  Scenario: Creating a tag with an empty name is blocked client-side
    When I clear the name and click Create tag
    Then a tag-name validation error should show
    And no extra BeautyAdminTag row should be created
