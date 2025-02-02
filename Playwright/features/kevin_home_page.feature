Feature: Kevin Home Page Validation

  Scenario Outline: Verify text is displayed
    Given I navigate to kevin home page
    Then it should display my name "<name>"
    And it should display my credentials "<credentials>"
    And it should display my profile picture
    And it should display the Download CV button
    And it should display the Contact Me button
    And it should display the LinkedIn icon
    And it should display the GitHub icon
    And it should display the Home button
    And it should display the About section
    And it should display the Experience section
    And it should display the Projects section
    And it should display the Contacts section
    And it should display the Footer section "<copyright>"

    Examples:
      | name        | credentials                         |copyright|
      | Kevin Ortiz | Quality Assurance & DevOps Engineer |Copyright © 2025 Kevin Ortiz. All Rights Reserved.|
