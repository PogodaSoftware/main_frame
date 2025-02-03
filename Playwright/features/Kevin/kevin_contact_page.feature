Feature: Kevin Contact Me Validation

  Scenario Outline: Verify text is displayed
    Given I navigate to kevin home page
    When I click on the Contact link
    Then It should display the Contact Me header "<header>"
    And It should display my email icon and address "<email>"
    And It should display my LinkedIn icon and link

    Examples:
      | header       | email                          |
      | Contact Me   | kevin.oritz.software@gmail.com |
