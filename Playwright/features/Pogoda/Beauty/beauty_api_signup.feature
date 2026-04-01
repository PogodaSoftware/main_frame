Feature: Beauty API Signup Endpoint

  Scenario: Successfully create a new customer account
    Given the beauty API is reachable
    When I POST valid customer signup data to the signup endpoint
    Then the signup response status should be 201
    And the signup response should contain the message "Account created successfully."
    And the signup response should contain the registered email

  Scenario: Reject duplicate customer email on signup
    Given a test customer account exists for duplicate check
    When I POST the same customer email to the signup endpoint again
    Then the signup response status should be 400
    And the signup response should indicate the email already exists

  Scenario: Reject customer signup with a short password
    Given the beauty API is reachable
    When I POST customer signup data with a password shorter than 8 characters
    Then the signup response status should be 400

  Scenario: Successfully create a new business provider account
    Given the beauty API is reachable
    When I POST valid business provider signup data to the business signup endpoint
    Then the business signup response status should be 201
    And the business signup response should contain "Business account created successfully."

  Scenario: Reject business provider signup with missing business name
    Given the beauty API is reachable
    When I POST business provider signup data without a business name
    Then the business signup response status should be 400
