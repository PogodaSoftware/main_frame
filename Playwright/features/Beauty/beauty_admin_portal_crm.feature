Feature: Beauty Admin Portal — CRM list (desktop)
  As a Beauty admin
  I want a reactive CRM list with real filters
  So that I can find and act on accounts without page reloads.

  Background:
    Given I am signed in as a Beauty admin viewing the CRM list

  Scenario: The Suspended status filter shows only suspended accounts
    When I click the "Suspended" status chip
    Then the visible rows should equal the real suspended-customer count
    And every visible row should show the "SUSPENDED" status

  Scenario: Live search narrows the list without pressing enter
    When I type a seeded customer's email prefix into the search box
    Then the list should narrow to that one account

  Scenario: Bulk Suspend routes to the audited suspend-confirm modal
    When I select the first account and click bulk Suspend
    Then the suspend-confirm screen for that account should open

  Scenario: No "Add tag" header button on the Customers CRM list
    Then there should be no "Add tag" button in the header actions area

  Scenario: "Manage tags" header button is present and navigates to the tag manager
    When I click the "Manage tags" header button
    Then I should land on the tag manager page

  Scenario: No "Add tag" header button on the Providers tab either
    When I switch to the Business providers tab
    Then there should be no "Add tag" button in the header actions area
