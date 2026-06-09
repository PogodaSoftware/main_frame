Feature: Shared weekly-hours editor

  The wizard schedule step and the post-acceptance availability page share
  one editor component (quick-set chips, Closed/Open/24h segmented pill,
  per-day sub-label, time-zone banner). These scenarios assert both screens
  render the same editor and that the legacy plain-list UI is gone.

  Background:
    Given a fresh business account exists for the hours editor

  Scenario: Wizard schedule step renders the redesigned editor
    Given I sign in as the hours editor business account
    When I open the wizard step "schedule" for hours editor
    Then the weekly hours editor should be visible
    And the legacy closed-day checkbox should not be present
    And the quick set label should display "Quick set"
    And the editor should render exactly 7 day rows
    And the time zone banner should mention "UTC"

  Scenario: Quick set on wizard schedule applies Mon-Fri 9-5
    Given I sign in as the hours editor business account
    When I open the wizard step "schedule" for hours editor
    And I click the quick set chip "Mon–Fri 9–5"
    Then day row 2 sub-label should display "09:00–17:00"
    And day row 6 sub-label should display "Closed"

  Scenario: Segmented pill on wizard schedule toggles 24h state
    Given I sign in as the hours editor business account
    When I open the wizard step "schedule" for hours editor
    And I click the 24h segment on day row 1
    Then day row 1 sub-label should display "Open 24h"
    And day row 1 time pair should be hidden

  Scenario: Availability page renders the same editor after acceptance
    Given the hours editor business has an accepted application
    And I sign in as the hours editor business account
    When I open the availability page
    Then the weekly hours editor should be visible
    And the legacy closed-day checkbox should not be present
    And the quick set label should display "Quick set"
    And the editor should render exactly 7 day rows
    And the time zone banner should mention "UTC"
