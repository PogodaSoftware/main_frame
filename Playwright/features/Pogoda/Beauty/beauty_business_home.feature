Feature: Beauty Business Home Page

  Scenario: Calendar + gauges render for an accepted business
    Given I am signed in as an accepted business with a known booking today
    When I open the business home page
    Then the business home calendar should render
    And today's calendar cell should be highlighted
    And the earnings gauge value should be visible
    And the bookings volume gauge value should be visible
