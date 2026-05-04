Feature: Beauty Business Services Setup

  Scenario: Add, edit and delete a service from the business portal
    Given I am signed in as an accepted business
    When I open the business services page
    And I add a new service named "Pedicure" in category "nails"
    Then the service "Pedicure" should appear in the services list
    When I edit the service "Pedicure" and rename it to "Deluxe Pedicure"
    Then the service "Deluxe Pedicure" should appear in the services list
    When I delete the service "Deluxe Pedicure"
    Then the service "Deluxe Pedicure" should no longer appear in the services list
