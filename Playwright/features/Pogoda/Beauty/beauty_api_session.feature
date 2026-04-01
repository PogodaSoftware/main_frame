Feature: Beauty API Session and Cookie Authentication

  Scenario: Accessing protected endpoint with a valid cookie returns user info
    Given a test customer is logged in via API
    When I GET the protected me endpoint with the auth cookie and correct device ID
    Then the me endpoint response status should be 200
    And the me endpoint response user type should be "customer"
    And the me endpoint response email should match the test customer email

  Scenario: Accessing protected endpoint without a cookie returns 401
    Given the beauty API is reachable
    When I GET the protected me endpoint without any cookie
    Then the me endpoint response status should be 401

  Scenario: Accessing protected endpoint with wrong device ID returns 401
    Given a test customer is logged in via API
    When I GET the protected me endpoint with the auth cookie but wrong device ID
    Then the me endpoint response status should be 401

  Scenario: Logging out invalidates the session
    Given a test customer is logged in via API
    When I POST to the logout endpoint with the auth cookie
    Then the logout response status should be 200
    And the logout response should contain the message "Logged out successfully."
    And subsequent GET to protected me endpoint should return 401
