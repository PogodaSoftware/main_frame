Feature: Beauty Authentication Flow

  Scenario: A new user signs up and is redirected to the home page
    Given I prepare fresh signup credentials
    And I navigate to the beauty signup page
    When I fill in the signup email and password
    And I submit the signup form
    Then I should be on the beauty home page after signup
    And the user email badge should be visible after signup

  Scenario: A registered user logs in with valid credentials
    Given a test customer account exists for login
    And I navigate to the beauty login page
    When I fill in the login email and password for the test customer
    And I submit the login form
    Then I should be on the beauty home page after login
    And the user email badge should be visible after login

  Scenario: A logged in user signs out successfully
    Given a test customer account exists for logout
    And I navigate to the beauty login page
    And I fill in the login email and password for logout
    And I submit the login form for logout
    When I click the sign out button
    Then the sign in button should be visible on the home page after logout
    And the sign up button should be visible on the home page after logout
