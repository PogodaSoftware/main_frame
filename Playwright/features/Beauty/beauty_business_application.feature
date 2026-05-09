Feature: Beauty Business Application Wizard

  Walks all 5 wizard steps + review/submit. Asserts ToS gating, ITIN
  required when entity is "business", and post-submit redirect to the
  dashboard.

  Background:
    Given a fresh business account exists for the wizard

  Scenario: Wizard happy path lands on dashboard
    Given I sign in as the wizard business account
    When I open the wizard step "entity"
    Then the wizard step counter should display "Step 1 of 6"
    When I fill in the entity step as a person named "Jess Owner" for "The Studio"
    And I submit the entity step
    Then the wizard step counter should display "Step 2 of 6"

    When I select the "nails" service category
    And I submit the services step
    Then the wizard step counter should display "Step 3 of 6"

    When I submit the stripe step
    Then the wizard step counter should display "Step 4 of 6"

    When I submit the schedule step
    Then the wizard step counter should display "Step 5 of 6"

    When I submit the tools step
    Then the wizard step counter should display "Step 6 of 6"

    Then the submit application button should be disabled
    When I tick the terms of service checkbox
    Then the submit application button should be enabled
    When I submit the application
    Then I should land on the business home page

  Scenario: ITIN required when business entity selected
    Given I sign in as the wizard business account
    When I open the wizard step "entity"
    And I choose the business entity option
    And I leave the ITIN field blank
    And I submit the entity step
    Then I should see a server error mentioning ITIN
