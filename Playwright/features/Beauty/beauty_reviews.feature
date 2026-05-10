Feature: Beauty Customer Reviews

  Scenario: R1 Customer with no completed booking sees no Leave-a-review button
    Given a beauty customer is logged in
    And the customer has no bookings
    When the customer visits the Glow Facial Studio provider page
    Then the reviews section should be visible
    And the reviews-empty state should be visible
    And the leave-review button should not be visible

  Scenario: R2 Customer with a completed booking can post a 5-star review
    Given a beauty customer is logged in
    And the customer has a completed booking for "Signature Facial"
    When the customer visits the Glow Facial Studio provider page
    And the customer clicks Leave-a-review
    And the customer selects 5 stars
    And the customer enters review text "Loved every minute"
    And the customer submits the review
    Then the customer should land on the Glow Facial Studio provider page
    And a review card with text "Loved every minute" should be visible
    And the provider review count should be at least 1

  Scenario: R3 Backend rejects a duplicate review for the same service
    Given a beauty customer is logged in
    And the customer has a completed booking for "Signature Facial"
    And the customer has already posted a 4-star review for "Signature Facial"
    When the customer attempts to POST a second review for "Signature Facial"
    Then the API should respond with status 409

  Scenario: R4 Customer can delete their own review and the count drops
    Given a beauty customer is logged in
    And the customer has a completed booking for "Signature Facial"
    And the customer has already posted a 4-star review for "Signature Facial"
    When the customer visits the Glow Facial Studio provider page
    And the customer deletes their own review
    Then the reviews-empty state should be visible

  Scenario: R5 Business cannot post a review even when authenticated
    Given a beauty business is logged in
    When the business attempts to POST a review for "Signature Facial"
    Then the API should respond with status 403

  Scenario: R6 Business owner sees the customer review and can post a reply
    Given a beauty customer is logged in
    And the customer has a completed booking for "Signature Facial"
    And the customer has already posted a 4-star review for "Signature Facial"
    And a beauty business owns the Glow Facial Studio provider
    When the business visits the Customer reviews page
    Then a business review card should be visible
    When the business posts the reply "Thanks for your feedback"
    Then the review reply block should display "Thanks for your feedback"
