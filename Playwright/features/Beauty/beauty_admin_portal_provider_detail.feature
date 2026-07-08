Feature: Beauty Admin Portal — Provider detail (desktop)
  As a Beauty admin
  I want the provider account to be a real desktop page with section tabs
  So that opening a business provider does not drop into a phone layout.

  Background:
    Given I am signed in as a Beauty admin viewing a test provider's detail

  Scenario: The provider detail renders identity, performance and section tabs
    Then the provider name and performance card should show
    And the Overview, Services, Reviews, Hours, Risk and Notes tabs should show

  Scenario: Switching to the Services tab shows the catalog panel
    When I click the Services tab
    Then the service catalog panel should show

  Scenario: Assigning a suggested tag persists and shows in place (RN parity)
    When I click a suggested tag
    Then a business tag assignment row should exist for that provider
    And the tag should appear as attached without a page reload

  Scenario: The full tag picker exposes more tags than the suggested capped list
    When I open the provider tag picker
    Then the provider picker panel should be visible
    And the provider picker should list more available tags than the suggested cap

  Scenario: Searching in the provider tag picker filters to the seeded tag
    When I open the provider tag picker
    And I type the seeded tag label fragment into the provider picker search
    Then the seeded tag should appear in the provider picker results

  Scenario: Picking a tag from the provider full picker attaches it and closes the picker
    When I open the provider tag picker
    And I click the seeded tag in the provider picker
    Then the provider picker should be closed
    And the seeded tag should appear as an attached provider chip
