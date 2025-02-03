Feature: Kevin Project Page Validation

  Scenario: Verify elements and text on the Projects page
    Given I navigate to kevin home page
    When I click on the Projects link
    Then It should display my project header 
    And it should display my first project image
    And It should display Project One
    And it should display my first project github link
    And it should display my first project live demo link
    And it should display my second project image
    And it should display my second project github link
    And it should display my second project live demo link
    And it should display my third project image
    And it should display my third project github link
    And it should display my third project live demo link
