Feature: Google mock sign-in (customer + business)
  The "Continue with Google" button opens a BFF-driven account chooser and,
  on picking a demo account, establishes a real session via the DEBUG-only
  mock endpoint. Customer lands on the customer home; business lands in the
  authenticated business area.

  Scenario: Customer signs in with the Google mock
    Given I navigate to the beauty login page
    When I click continue with Google
    And I pick the first Google account
    Then I should land on the authenticated customer home

  Scenario: Business signs in with the Google mock
    Given I navigate to the beauty business login page
    When I click continue with Google
    And I pick the first Google account
    Then I should land in the authenticated business area
