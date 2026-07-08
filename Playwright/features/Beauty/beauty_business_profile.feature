Feature: Beauty Business Profile (earnings)

  Scenario: Profile button on home opens the financial dashboard
    Given I am signed in as an accepted business with a paid booking
    When I open the business home page
    And I click the business profile button
    Then the business profile page should render
    And the lifetime earnings value should be visible
    And the lifetime earnings should reflect the paid booking
