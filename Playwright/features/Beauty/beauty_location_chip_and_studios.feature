Feature: Location chip and studios-near-you bug fixes

  # Fix 1 — Location chip is outside the search pill (right-justified)
  Scenario: Location chip sits outside the search pill in the top nav
    Given an authenticated customer "anika.patel@gmail.com" is on the beauty home page
    Then the location chip should be visible in the top nav
    And the search pill should not contain the location chip
    And the search pill should not contain a search-sep or search-city child
    And the location chip should appear after the search pill in the DOM

  # Fix 2 — Studios near you are BFF-driven and clickable
  Scenario: Studios near you section shows BFF-driven provider cards
    Given an authenticated customer "anika.patel@gmail.com" is on the beauty home page
    Then if the studios section is present each card has the studio-card class
    And clicking the first studio card navigates to the provider detail page

  # Fix 3 — Location chip appears on all authenticated customer pages
  Scenario: Location chip is visible on the bookings page
    Given an authenticated customer "anika.patel@gmail.com" is on the beauty home page
    When the customer navigates to the bookings page
    Then the location chip should be visible in the top nav
    And the location chip text should contain the user city

  Scenario: Location chip is visible on the saved page
    Given an authenticated customer "anika.patel@gmail.com" is on the beauty home page
    When the customer navigates to the saved page
    Then the location chip should be visible in the top nav
    And the location chip text should contain the user city

  Scenario: Location chip is visible on the messages page
    Given an authenticated customer "anika.patel@gmail.com" is on the beauty home page
    When the customer navigates to the messages page
    Then the location chip should be visible in the top nav
    And the location chip text should contain the user city

  # Search pill fix — projected search fills the pill (native clear ✕ flush-right)
  # and the no-results dropdown spans the bar width (not a fixed 440px).
  Scenario: Search input and empty-state span the search bar
    Given an authenticated customer "anika.patel@gmail.com" is on the beauty home page
    When the customer searches for a query with no matches
    Then the search empty-state should be visible
    And the search empty-state should span the search bar width
    And the search input should span the search bar width
