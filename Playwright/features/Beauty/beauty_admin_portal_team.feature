Feature: Beauty Admin Portal — Team page
  As a Beauty admin owner
  I want to view the admin roster, invite new admins, change their roles,
  and revoke access
  So that the team management surface drives real backend state changes.

  Background:
    Given I am signed in as a Beauty Owner with seeded admin roster

  Scenario: Team page renders the seeded admins
    When I open the admin portal team page
    Then the team page should render
    And the roster should list every seeded admin
    And the page header should show the real admin and owner counts

  Scenario: Owner invites a new admin
    When I open the admin portal team page
    And I fill the invite composer with "new_invite@beauty-test.com" as "Support agent"
    And I click "Send invite"
    Then a BeautyAdminInvite row should exist for "new_invite@beauty-test.com"
    And a "team.invite" audit event should be logged for that email
    And the page should list "new_invite@beauty-test.com" under pending invites

  Scenario: Owner changes another admin's role
    When I open the admin portal team page
    And I open the kebab menu for the support-lead admin
    And I pick "Risk analyst" and click Save
    Then the principal's role in the DB should be "risk_analyst"
    And a "team.role" audit event should be logged for the principal

  Scenario: Owner revokes another admin's access
    When I open the admin portal team page
    And I open the kebab menu for the support-agent admin
    And I click "Revoke admin"
    Then the principal should be removed from the DB
    And a "team.revoke" audit event should be logged
