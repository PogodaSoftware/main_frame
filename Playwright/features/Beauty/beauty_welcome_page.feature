Feature: Beauty Welcome Page Validation

  Scenario: Verify welcome page elements for an unauthenticated visitor
    Given I navigate to the beauty welcome page
    Then the beauty welcome page should be visible
    And the welcome brand block should be visible
    And the welcome sign in button should be visible on the welcome page
    And the welcome create account button should be visible
    And the welcome google button should be visible

  Scenario: Clicking sign in routes to the login page
    Given I navigate to the beauty welcome page
    When I click the welcome sign in button
    Then I should land on the beauty login page

  Scenario: Clicking create account routes to the signup page
    Given I navigate to the beauty welcome page
    When I click the welcome create account button
    Then I should land on the beauty signup page
