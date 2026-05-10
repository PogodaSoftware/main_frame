Feature: Beauty Customer Search Experience

  Scenario: V1 Search UI loads with input, location pill, empty results
    Given an authenticated customer with city "Seattle" is on the search page
    Then the beauty search page should be visible
    And the search input should be visible
    And the search location pill should display "Seattle"
    And no pagination controls should be visible

  Scenario: V2 Debounced queries collapse rapid keystrokes into one request
    Given an authenticated customer with city "Seattle" is on the search page
    When the customer types "facial" in the search input
    Then exactly one debounced search request should be sent

  Scenario: V3 Backend rate limit triggers a 429 and a slow-down toast
    Given an authenticated customer with city "Seattle" is on the search page
    When 50 rapid search requests are issued from the same client
    Then a 429 response should be observed
    And the search rate-limit toast should be visible

  Scenario: V4 Location filter is applied automatically
    Given an authenticated customer with city "Seattle" is on the search page
    When the customer types "spa" in the search input
    Then the search request payload should include "location=Seattle"

  Scenario: V5 Keyword search returns matching items
    Given an authenticated customer with city "Seattle" is on the search page
    And a service named "Microblading Brows" exists in "Seattle"
    When the customer types "microblading" in the search input
    Then at least one search result card should be visible
    And the visible results should include "Microblading"

  Scenario: V6 Future services appear with a Coming Soon badge
    Given an authenticated customer with city "Seattle" is on the search page
    And a future service named "Holiday Manicure" exists in "Seattle"
    When the customer types "holiday manicure" in the search input
    Then a result card with the Coming Soon badge should be visible

  Scenario: V7 Infinite scroll loads more items and ends with a marker
    Given an authenticated customer with city "Seattle" is on the search page
    And 25 services exist in "Seattle" for infinite scroll
    When the customer scrolls to the bottom of the search results
    Then more search result cards should load automatically
    And the end-of-results marker should eventually be visible

  Scenario: V8 No pagination UI is rendered at any point
    Given an authenticated customer with city "Seattle" is on the search page
    Then no pagination controls should be visible

  Scenario: V9 Search input is focusable and labelled for accessibility
    Given an authenticated customer with city "Seattle" is on the search page
    Then the search input should be focusable and have an accessible label
    And the search results region should announce updates politely

  Scenario: V11 Backend errors surface as a generic error toast
    Given an authenticated customer with city "Seattle" is on the search page
    When the search backend returns a 500 error for the next request
    And the customer types "broken" in the search input
    Then the search error toast should be visible

  Scenario: V12 First search request completes within 800ms
    Given an authenticated customer with city "Seattle" is on the search page
    When the customer types "facial" in the search input
    Then the first search response should arrive within 800 ms
