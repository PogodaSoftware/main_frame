Feature: Beauty BFF Resolve Endpoint

  Scenario: Resolving beauty_home screen without authentication returns render action
    Given the beauty API is reachable
    When I POST to the BFF resolve endpoint with screen "beauty_home" and no cookie
    Then the BFF response status should be 200
    And the BFF response action should be "render"
    And the BFF response screen should be "beauty_home"
    And the BFF response data should show is_authenticated as false

  Scenario: Resolving beauty_login screen without authentication returns render action
    Given the beauty API is reachable
    When I POST to the BFF resolve endpoint with screen "beauty_login" and no cookie
    Then the BFF response status should be 200
    And the BFF response action should be "render"
    And the BFF response screen should be "beauty_login"

  Scenario: Resolving beauty_signup screen without authentication returns render action
    Given the beauty API is reachable
    When I POST to the BFF resolve endpoint with screen "beauty_signup" and no cookie
    Then the BFF response status should be 200
    And the BFF response action should be "render"
    And the BFF response screen should be "beauty_signup"

  Scenario: Resolving beauty_business_login screen without authentication returns render action
    Given the beauty API is reachable
    When I POST to the BFF resolve endpoint with screen "beauty_business_login" and no cookie
    Then the BFF response status should be 200
    And the BFF response action should be "render"
    And the BFF response screen should be "beauty_business_login"

  Scenario: Resolving beauty_home screen while authenticated returns user info
    Given a test customer is logged in via API for BFF test
    When I POST to the BFF resolve endpoint with screen "beauty_home" and auth cookie
    Then the BFF response status should be 200
    And the BFF response action should be "render"
    And the BFF response data should show is_authenticated as true

  Scenario: Resolving beauty_login screen while authenticated returns redirect
    Given a test customer is logged in via API for BFF test
    When I POST to the BFF resolve endpoint with screen "beauty_login" and auth cookie
    Then the BFF response status should be 200
    And the BFF response action should be "redirect"
    And the BFF redirect target should be "beauty_home"

  Scenario: Resolving an unknown screen returns 400
    Given the beauty API is reachable
    When I POST to the BFF resolve endpoint with an unknown screen name
    Then the BFF response status should be 400

  Scenario: Resolving without device_id returns 400
    Given the beauty API is reachable
    When I POST to the BFF resolve endpoint without a device_id
    Then the BFF response status should be 400
