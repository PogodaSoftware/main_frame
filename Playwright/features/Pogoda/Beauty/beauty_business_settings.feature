Feature: Beauty Business Settings (gear menu)

  Scenario: Gear button on home opens the settings menu
    Given I am signed in as an accepted business
    When I open the business home page
    And I click the business gear button
    Then the business settings menu should render
    And I should see a change-password setting
    And I should see a schedule setting
    And I should see a delete-account setting
    And I should see a log-out setting

  Scenario: Schedule setting opens the weekly hours editor
    Given I am signed in as an accepted business
    When I open the business settings page
    And I click the schedule setting
    Then I should land on the weekly hours editor

  Scenario: Change password setting opens the change-password form
    Given I am signed in as an accepted business
    When I open the business settings page
    And I click the change-password setting
    Then the change-password form should render

  Scenario: Log out from the settings menu signs me out
    Given I am signed in as an accepted business
    When I open the business settings page
    And I click the log-out setting
    And I confirm the dialog
    Then I should land on the business login page

  Scenario: Delete account from settings removes the account
    Given I am signed in as an accepted business
    When I open the business settings page
    And I click the delete-account setting
    And I confirm the dialog
    Then the business account should be deleted
