Feature: Beauty Search results link to provider detail

  Each result card on /pogoda/beauty/search must show its owning
  business and, when clicked, navigate to that business's provider
  detail page (/pogoda/beauty/providers/:id) so the customer can
  book from there.

  Scenario: V13 Result card displays the owning business name
    Given an authenticated customer with city "NYC" is on the search page
    When the customer types "signature" in the search input
    Then a search result card for "Signature Facial" should be visible
    And that result card should display the business "Glow Facial Studio"

  Scenario: V14 Clicking a result card opens that business's provider page
    Given an authenticated customer with city "NYC" is on the search page
    When the customer types "signature" in the search input
    And the customer clicks the first search result card
    Then the URL should match "/pogoda/beauty/providers/"
    And the provider detail page for "Glow Facial Studio" should be visible

  Scenario: V15 Clicking the Brightening Peel result also opens Glow Facial Studio
    Given an authenticated customer with city "NYC" is on the search page
    When the customer types "brightening" in the search input
    And the customer clicks the first search result card
    Then the URL should match "/pogoda/beauty/providers/"
    And the provider detail page for "Glow Facial Studio" should be visible
