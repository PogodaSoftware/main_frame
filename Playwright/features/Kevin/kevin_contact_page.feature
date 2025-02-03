Feature: Kevin Contact Me Validation

  Scenario: Verify text is displayed
    Given I navigate to kevin home page
    When I click on the Contact link
    Then It should display the Contact Me header 
    And It should display my email icon and address 
    And It should display my LinkedIn icon and link

