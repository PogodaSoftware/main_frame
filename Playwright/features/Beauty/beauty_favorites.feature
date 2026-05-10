Feature: Beauty Customer Favorites

  Scenario: F1 Customer toggles favorite on a provider page (off -> on, persists)
    Given a beauty customer is logged in
    When the customer visits the Glow Facial Studio provider page
    Then the favorite toggle for "Signature Facial" should be off
    When the customer clicks the favorite toggle for "Signature Facial"
    Then the favorite toggle for "Signature Facial" should be on
    When the customer reloads the provider page
    Then the favorite toggle for "Signature Facial" should be on

  Scenario: F2 Customer toggles favorite off and reload still shows off
    Given a beauty customer is logged in
    And the customer has favorited "Signature Facial" via API
    When the customer visits the Glow Facial Studio provider page
    Then the favorite toggle for "Signature Facial" should be on
    When the customer clicks the favorite toggle for "Signature Facial"
    Then the favorite toggle for "Signature Facial" should be off
    When the customer reloads the provider page
    Then the favorite toggle for "Signature Facial" should be off

  Scenario: F3 Saved page lists the favorite and links back to the provider
    Given a beauty customer is logged in
    And the customer has favorited "Signature Facial" via API
    When the customer opens the Saved Services page from Profile
    Then a saved card for "Signature Facial" should be visible
    And the saved card should display the business "Glow Facial Studio"
    When the customer clicks the saved card
    Then the URL should match "/pogoda/beauty/providers/"

  Scenario: F4 Customer with no favorites sees the saved-empty state
    Given a beauty customer is logged in
    When the customer visits the Saved Services page directly
    Then the saved-empty state should be visible

  Scenario: F5 Business cannot favorite a service via API
    Given a beauty business is logged in
    When the business attempts to POST a favorite for "Signature Facial"
    Then the API should respond with status 403

  Scenario: F6 Favorite POST is idempotent and DELETE on missing favorite is safe
    Given a beauty customer is logged in
    When the customer POSTs a favorite for "Signature Facial"
    Then the API should respond with status 201
    When the customer POSTs a favorite for "Signature Facial"
    Then the API should respond with status 200
    When the customer DELETEs the favorite for "Signature Facial"
    Then the API should respond with status 204
    When the customer DELETEs the favorite for "Signature Facial"
    Then the API should respond with status 204
