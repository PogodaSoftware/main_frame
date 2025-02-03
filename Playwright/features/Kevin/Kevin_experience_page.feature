Feature: Kevin Experience Page Validation

  Scenario Outline: Verify text is displayed
    Given I navigate to kevin home page
    When I click on the Experience link
    Then it should display all of my current Experience
