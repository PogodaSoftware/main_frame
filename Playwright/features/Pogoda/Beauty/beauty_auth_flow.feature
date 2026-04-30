Feature: Beauty Authentication Flow

  Scenario: A new user signs up and lands back on the welcome page
    Given I prepare fresh signup credentials
    And I navigate to the beauty signup page
    When I fill in the signup email and password
    And I submit the signup form
    Then I should be on the beauty welcome page after signup
    And the welcome sign in button should be visible after signup

  Scenario: A registered user logs in with valid credentials
    Given a test customer account exists for login
    And I navigate to the beauty login page
    When I fill in the login email and password for the test customer
    And I submit the login form
    Then I should be on the beauty home page after login
    And the bottom nav should be visible after login

  Scenario: A logged in user signs out successfully via the profile page
    Given a test customer account exists for logout
    And I navigate to the beauty login page
    And I fill in the login email and password for logout
    And I submit the login form for logout
    When I open the profile page from the bottom nav
    And I click the sign out button on the profile page
    Then I should be back on the welcome page after logout
    And the welcome sign in button should be visible
