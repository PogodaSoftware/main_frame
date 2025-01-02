Feature: Kevin Home Page Validation

  Scenario Outline: Verify text is displayed
    Given I navigate to kevin home page 
    Then it should display the text "<text>"

    Examples:
      | text                                     |
      | Kevin home works! test testing!!!!!!!!!! |
