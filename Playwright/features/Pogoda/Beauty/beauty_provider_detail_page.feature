Feature: Beauty Provider Detail Page Validation

  Scenario: Authenticated customer views a provider detail page
    Given an authenticated customer is on a provider detail page
    Then the beauty provider page should be visible
    And the provider hero should be visible
    And the provider services title should be visible
    And at least one provider service row should be visible
    And at least one provider book button should be visible
    And the provider bottom nav should be visible
