Feature: Beauty Admin Portal — Feature Flags (desktop)
  As a Beauty admin
  I want a desktop feature-flags page on the shared admin chrome
  So that I can toggle runtime flags and see the change audit trail.

  Background:
    Given I am signed in as a Beauty admin viewing the feature flags page

  Scenario: The flags page renders on the shared desktop chrome with real flags
    Then the flags page should display the desktop admin chrome
    And the flags page should show at least one flag row

  Scenario: The sidebar shows Feature flags as the active item
    Then the sidebar Feature flags item should be active

  Scenario: Toggling a flag flips its state and writes an audit row
    When I toggle the first feature flag
    Then the first flag state should be flipped
    And the audit table should show a change row for that flag

  Scenario: The deleted screens no longer resolve
    Then the BFF should reject beauty_admin_portal_dashboard_v2
    And the BFF should reject beauty_admin_crm
