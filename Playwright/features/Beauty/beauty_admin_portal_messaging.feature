Feature: Beauty Admin Portal — In-app messaging (customer + provider detail)
  As a Beauty admin
  I want to send in-app messages to customers and providers with active booking threads
  So that I can communicate through the booking chat channel.

  # ── Customer messaging ────────────────────────────────────────────────────

  Scenario: Customer In-app message button is disabled when no booking thread exists
    Given I am signed in as a Beauty admin viewing a customer with no messageable booking
    Then the customer In-app message button should be disabled

  Scenario: Customer In-app message delivers via active booking thread
    Given I am signed in as a Beauty admin viewing a customer with a messageable booking
    When I click the customer In-app message button
    Then the customer message composer should be visible
    When I type a message body into the customer composer
    And I click the customer composer send button
    Then the customer message send should succeed
    And a BeautyChatMessage with sender_type admin should exist on the customer booking
    And a message.send audit event should exist for the customer target

  # ── Provider messaging ────────────────────────────────────────────────────

  Scenario: Provider In-app message button is disabled when no booking thread exists
    Given I am signed in as a Beauty admin viewing a provider with no messageable booking
    Then the provider In-app message button should be disabled

  Scenario: Provider In-app message delivers via active booking thread
    Given I am signed in as a Beauty admin viewing a provider with a messageable booking
    When I click the provider In-app message button
    Then the provider message composer should be visible
    When I type a message body into the provider composer
    And I click the provider composer send button
    Then the provider message send should succeed
    And a BeautyChatMessage with sender_type admin should exist on the provider booking
    And a message.send audit event should exist for the provider target
