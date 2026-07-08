Feature: Beauty Business Logout

  Scenario: Logged-in business clears its cookie and lands on the business login
    Given I am signed in as an accepted business
    When I open the business home page
    And I click the business sign-out button
    Then I should land on the business login page
    And the beauty session cookie should not be present
