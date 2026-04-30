Feature: Beauty Error Pages Validation

  Scenario Outline: Verify error page renders for variant <route>
    Given I navigate to the beauty error route "<route>"
    Then the beauty error page should be visible
    And the error eyebrow should display "<eyebrow>"
    And the error title should be visible
    And the error body should be visible
    And the error code should be visible
    And the error try again button should be visible
    And the error go home button should be visible
    And the error contact support link should be visible

    Examples:
      | route           | eyebrow              |
      | beauty_error    | Something went wrong |
      | beauty_404      | Page not found       |
      | beauty_offline  | No connection        |
      | beauty_catchall | Page not found       |
