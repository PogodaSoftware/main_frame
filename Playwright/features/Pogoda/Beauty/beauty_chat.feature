Feature: Beauty Per-Booking Chat

  Scenario: Authenticated customer with no bookings sees empty chat list
    Given an authenticated customer is on the chats list page
    Then the chats list page should be visible
    And the chats empty state should be visible

  Scenario: Customer can open a chat thread for an existing booking
    Given an authenticated customer with a booking is on the chats list page
    When the customer opens the chat thread for that booking
    Then the chat thread page should be visible
    And the message composer should be visible
    And the phone placeholder button should be disabled

  Scenario: Customer can send a message to the business provider
    Given an authenticated customer with a booking is on the chats list page
    When the customer opens the chat thread for that booking
    And the customer types "Hi, do you accept walk-ins?" and clicks send
    Then the sent message should be visible in the thread

  Scenario: Business provider can read and reply on the same booking thread
    Given an authenticated business with an incoming booking is on the chats list page
    When the business opens the chat thread for that booking
    And the business types "Yes, see you Saturday" and clicks send
    Then the sent message should be visible in the thread

  Scenario: Customer cannot open a chat for a non-existent booking
    Given an authenticated customer is on the chats list page
    When the customer navigates directly to a chat thread URL for an unknown booking
    Then the chats list page should be visible

  Scenario: Chat is disabled 24 hours after the service is over
    Given an authenticated customer with a long-past booking is on the chats list page
    Then the chats empty state should be visible
