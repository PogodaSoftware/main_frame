Feature: Beauty Business Change Password

  Scenario: Successful password change
    Given I am signed in as an accepted business
    When I open the change-password page
    And I enter my current password and a new strong password
    And I submit the change-password form
    Then the form should report the password was updated
    And I should be able to sign in with the new password

  Scenario: Wrong current password is rejected
    Given I am signed in as an accepted business
    When I open the change-password page
    And I enter a wrong current password and a new strong password
    And I submit the change-password form
    Then the form should report a current password error
