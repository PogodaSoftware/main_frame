Feature: Beauty Admin CRM

  Scenario: Admin sees customers and business providers in CRM
    Given I am signed in as a beauty admin with seeded accounts
    When I open the admin CRM page
    Then the CRM directory should render
    And the page should show both customer and business rows

  Scenario: Filter tab shows only customer accounts
    Given I am signed in as a beauty admin with seeded accounts
    When I open the admin CRM page
    And I click the customers tab
    Then every visible row should be a customer

  Scenario: Filter tab shows only business accounts
    Given I am signed in as a beauty admin with seeded accounts
    When I open the admin CRM page
    And I click the businesses tab
    Then every visible row should be a business

  Scenario: Search narrows results
    Given I am signed in as a beauty admin with seeded accounts
    When I open the admin CRM page
    And I search for the unique business
    Then only the matching account should be listed

  Scenario: Pagination shows additional pages
    Given I am signed in as a beauty admin with seeded accounts
    When I open the admin CRM page
    Then the pagination control should report multiple pages
    When I click the next page button
    Then the page number should advance to two

  Scenario: Suspending a customer blocks login and shows badge
    Given I am signed in as a beauty admin with seeded accounts
    When I open the admin CRM page
    And I click the customers tab
    And I suspend the seeded login customer
    Then the suspended badge should be visible
    And the seeded customer should not be able to log in
    When I reinstate the seeded login customer
    Then the seeded customer should be able to log in
