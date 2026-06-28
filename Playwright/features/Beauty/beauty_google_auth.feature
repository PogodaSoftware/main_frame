Feature: Google mock sign-in (DEBUG-only convincing mock)

  The "Continue with Google" button routes to a BFF-driven account chooser;
  picking a demo account issues a real beauty_auth session cookie via the
  DEBUG-gated mock endpoint and lands the user in the right context.

  Scenario: Customer signs in with the Google mock and lands on home
    Given I open the customer login page for Google sign-in
    When I continue with Google and pick the first customer account
    Then I should land authenticated on the customer home

  Scenario: Business signs in with the Google mock and enters the business portal
    Given I open the business login page for Google sign-in
    When I continue with Google and pick the first business account
    Then I should land in the business portal
