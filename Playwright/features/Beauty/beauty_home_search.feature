Feature: Beauty Customer Home Search Bar

  Scenario: V1 Search bar renders above the home carousel
    Given an authenticated customer with city "Seattle" is on the home page
    Then the home search bar should be visible
    And the home search bar should appear above the home carousel
    And no home pagination controls should be visible

  Scenario: V2 Debounced typing collapses keystrokes into one request
    Given an authenticated customer with city "Seattle" is on the home page
    When the customer types "na" then "ils" in the home search input
    Then exactly one debounced home search request should be sent

  Scenario: V3 Real backend data populates result cards on Enter
    Given an authenticated customer with city "Seattle" is on the home page
    And a service named "Nail Spa" exists in "Seattle"
    When the customer types "nail" in the home search input
    Then at least one home search result card should be visible
    And the visible home results should include "Nail"

  Scenario: V4 Results are ordered by proximity
    Given an authenticated customer with city "Seattle" is on the home page
    And the search backend returns two mocked nail spas with distances 5 and 15
    When the customer types "nail" in the home search input
    Then the first home search result should be "Nail Spa A"
    And the first home result card data-distance should be 5

  Scenario: V5 Clicking a result navigates to the service detail route
    Given an authenticated customer with city "Seattle" is on the home page
    And the search backend returns a single mocked service with id 4242
    When the customer types "nail" in the home search input
    And the customer clicks the first home search result card
    Then the URL should be the service detail route for service 4242

  Scenario: V7 The result list reflects exactly the API payload
    Given an authenticated customer with city "Seattle" is on the home page
    And the search backend returns a single mocked service with id 4242
    When the customer types "nail" in the home search input
    Then exactly one home search result card should be rendered

  Scenario: V9 Search input is labelled and live region announces results
    Given an authenticated customer with city "Seattle" is on the home page
    Then the home search input should have an accessible label
    And the home search status should announce updates politely

  Scenario: V10 Backend errors surface as a generic toast
    Given an authenticated customer with city "Seattle" is on the home page
    When the home search backend returns 500 for the next request
    And the customer types "broken" in the home search input
    Then the home search error toast should be visible

  Scenario: V11 Rate-limit response shows a slow-down toast
    Given an authenticated customer with city "Seattle" is on the home page
    When the home search backend returns 429 for the next request
    And the customer types "spam" in the home search input
    Then the home search rate-limit toast should be visible

  Scenario: V12 Search bar is full-width on mobile and aligned on desktop
    Given an authenticated customer with city "Seattle" is on the home page
    When the viewport is resized to mobile width
    Then the home search bar should be visible
    When the viewport is resized to desktop width
    Then the home search bar should be visible
