Feature: Beauty Customer/Business Role Separation
  Enforce that an email may belong to at most one role and that login,
  signup, rate-limiting and audit logging behave per the V1/V3/V4/V7/
  V8/V9/V10/V11 acceptance matrix.

  Background:
    Given the beauty API is reachable

  # V1 — global email uniqueness on signup -------------------------

  Scenario: Customer signup rejected when email already belongs to a business
    Given a test business provider account exists for cross-role check
    When I POST that business email to the customer signup endpoint
    Then the cross-role signup response status should be 409
    And the cross-role signup response detail should be the generic duplicate message

  Scenario: Business signup rejected when email already belongs to a customer
    Given a test customer account exists for cross-role check
    When I POST that customer email to the business signup endpoint
    Then the cross-role signup response status should be 409
    And the cross-role signup response detail should be the generic duplicate message

  # V3 / V4 / V7 — wrong-portal login is rejected -------------------

  Scenario: Provider credentials rejected on the customer login API
    Given a test business provider account exists for cross-role login
    When I POST those business credentials to the customer login endpoint
    Then the cross-role login response status should be 401
    And the cross-role login response detail should be the generic auth failure message

  Scenario: Customer credentials rejected on the business login API
    Given a test customer account exists for cross-role login
    When I POST those customer credentials to the business login endpoint
    Then the cross-role login response status should be 401
    And the cross-role login response detail should be the generic auth failure message

  # V8 — per-IP rate limiting on cross-role failures ---------------

  Scenario: Repeated cross-role login attempts trip the rate limit
    Given a test business provider account exists for rate-limit check
    When I send 5 cross-role login attempts using that business email to the customer login endpoint
    And I send one more cross-role login attempt to the customer login endpoint
    Then the final cross-role login response status should be 429

  # V9 — audit logging --------------------------------------------

  Scenario: Cross-role login attempts produce an audit log entry
    Given a test business provider account exists for audit check
    When I POST those business credentials to the customer login endpoint
    Then an audit row should exist for that masked email and the cross_role_login event

  # V11 — role claim enforced on protected endpoints ---------------

  Scenario: Customer session cannot reach a business-only endpoint
    Given a test customer account exists for role-claim check
    When I log in as that customer via the customer login endpoint
    And I call the business dashboard endpoint with the customer session
    Then the business dashboard response status should be 403

  # Screen-level portal isolation via the BFF resolve envelope ------

  Scenario: A signed-in business is bounced off a customer screen
    Given a signed-in business session
    When that session resolves the "beauty_profile" screen
    Then the resolve envelope should redirect to "beauty_business_home"

  Scenario: A signed-in customer is bounced off a business screen
    Given a signed-in customer session
    When that session resolves the "beauty_business_home" screen
    Then the resolve envelope should redirect to "beauty_home"

  Scenario: A non-admin customer is bounced off an admin screen
    Given a signed-in customer session
    When that session resolves the "beauty_admin_portal_dashboard" screen
    Then the resolve envelope should redirect to "beauty_home"

  Scenario: A non-admin customer cannot reach the admin 2FA screen
    Given a signed-in customer session
    When that session resolves the "beauty_admin_portal_2fa" screen
    Then the resolve envelope should redirect to "beauty_home"
