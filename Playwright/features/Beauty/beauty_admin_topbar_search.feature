Feature: Beauty Admin Portal — Topbar global search
  As a Beauty admin
  I want to use the topbar search bar on any admin page
  So that I can quickly jump to a filtered CRM view without navigating manually.

  Background:
    Given I am signed in as a Beauty admin with a seeded search customer

  Scenario: Search from dashboard navigates to filtered CRM
    Given I am on the admin portal dashboard
    When I type the customer fragment into the topbar search and press Enter
    Then the URL should contain the search query parameter
    And the CRM list should show only matching rows
    And the matching customer row should be visible

  Scenario: CRM in-page search box carries the query
    Given I am on the admin portal dashboard
    When I type the customer fragment into the topbar search and press Enter
    Then the CRM in-page search input should be prefilled with the query

  Scenario: Empty search opens unfiltered CRM
    Given I am on the admin portal dashboard
    When I submit an empty topbar search
    Then the URL should not contain a query parameter
    And the CRM list should show more rows than the filtered result

  Scenario: Clear button empties the topbar search field
    Given I am on the admin portal dashboard
    When I type the customer fragment into the topbar search input
    Then the topbar search clear button should be visible
    When I click the topbar search clear button
    Then the topbar search input should be empty
