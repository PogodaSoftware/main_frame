Feature: Pogoda Home Page Validation

  Scenario Outline: Verify text is displayed
    Given I navigate to pogoda home page 
    Then it should display the text "<text>"

    Examples:
      | text                                     |
      | Pogoda home works111! |
