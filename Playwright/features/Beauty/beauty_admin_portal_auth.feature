Feature: Beauty Admin Portal — Auth screens (desktop)
  As a Beauty admin
  I want the slate split-pane auth flow to work on desktop
  So that I can sign in, fall back to a magic link, and understand IP blocks.

  Background:
    Given the beauty API is reachable

  Scenario: Signing in with valid credentials advances to the 2FA step
    Given a seeded admin principal exists
    When I open the admin sign-in page at desktop width
    And I submit the admin sign-in form with the seeded credentials
    Then the browser should hold a beauty_auth session cookie
    And the two-factor step should render

  Scenario: The magic-link screen renders form-only by default
    Given a seeded admin session is active
    When I open the admin magic-link page at desktop width
    Then the magic-link form should render
    And the "Link sent" success card should not be visible

  Scenario: The IP-warning screen renders the allowlist block
    When I open the admin IP-warning page at desktop width
    Then the IP allowlist alert should render
