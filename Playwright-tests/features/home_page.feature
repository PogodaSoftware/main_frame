Feature: Home Page Validation

  Scenario Outline: Verify text is displayed
    Given I navigate to the home page "<url>"
    When I check the element with XPath "<xpath>"
    Then it should display the text "<expected_text>"

    Examples:
      | url                        | xpath | expected_text                            |
      | http://localhost:80/kevin  | p     | Kevin home works! test testing!!!!!!!!!! |
      | http://localhost:80/pogoda | p     | Pogoda home works111!                    |
