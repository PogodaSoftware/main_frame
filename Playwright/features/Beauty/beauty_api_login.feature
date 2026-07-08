Feature: Beauty API Login Endpoint

  Scenario: Customer logs in with valid credentials and receives an auth cookie
    Given a test customer account exists for API login
    When I POST valid customer login credentials with a device ID
    Then the customer login response status should be 200
    And the customer login response should contain the message "Login successful."
    And the response should set the beauty_auth cookie

  Scenario: Customer login is rejected with an incorrect password
    Given a test customer account exists for wrong password check
    When I POST customer login credentials with the wrong password
    Then the customer login response status should be 401

  Scenario: Customer login is rejected when device ID is missing
    Given a test customer account exists for missing device ID check
    When I POST customer login credentials without a device ID
    Then the customer login response status should be 400

  Scenario: Business provider logs in with valid credentials and receives an auth cookie
    Given a test business account exists for API login
    When I POST valid business login credentials with a device ID
    Then the business login response status should be 200
    And the business login response should contain the message "Login successful."
    And the business login response should set the beauty_auth cookie
