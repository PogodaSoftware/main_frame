Feature: Beauty Error Pages Validation

  Scenario Outline: Verify error page renders for variant <route>
    Given I navigate to the beauty error route "<route>"
    Then the beauty error page should be visible
    And the error eyebrow should display "<eyebrow>"
    And the error title should be visible
    And the error body should be visible
    And the error action button should be visible

    Examples:
      | route           | eyebrow              |
      | beauty_error    | Something went wrong |
      | beauty_404      | 404                  |
      | beauty_offline  | No connection        |
      | beauty_catchall | 404                  |

  Scenario: Generic error page shows refresh and contact support buttons
    Given I navigate to the beauty error route "beauty_error"
    Then the beauty error page should be visible
    And the error primary CTA button should be visible
    And the error contact support button should be visible

  Scenario: Not-found page shows only the back home button
    Given I navigate to the beauty error route "beauty_404"
    Then the beauty error page should be visible
    And the error primary CTA button should be visible

  Scenario: Offline page shows the try again button
    Given I navigate to the beauty error route "beauty_offline"
    Then the beauty error page should be visible
    And the error primary CTA button should be visible
