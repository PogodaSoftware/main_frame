Feature: Kevin About Page Validation

  Scenario Outline: Verify text is displayed
    Given I navigate to kevin home page
    Then I click on the about link in the navigation bar
    And it should display the experience icon
    And it should display the experience display text "<experience>"
    And it should display the experience first paragraph text "<experience-paragraph1>"
    And it should display the experience second paragraph text "<experience-paragraph2>"
    And it should display the experience third paragraph text "<experience-paragraph3>"
    And it should display the education icon
    And it should display the education text "<education>"
    And it should display the education first paragraph text "<education-paragraph1>"
    And it should display the education second paragraph text "<education-paragraph2>"
    And it should display the introduction text "<intro>"
    And it should display the Home button
    And it should display the About section
    And it should display the Experience section
    And it should display the Projects section
    And it should display the Contacts section
    And it should display the Footer section "<copyright>"

    Examples:
      | experience | experience-paragraph1        | experience-paragraph2                | experience-paragraph3      | education | education-paragraph1                  | education-paragraph2                                    | intro                                                                                                                                                                                                                                                      |copyright|
      | Experience | 3 + years Software Developer | 2 + years Quality Assurance Engineer | 3 + months DevOps Engineer | Education | B.Sc. in Marine Environmental Science | Software Engineering training at Perscholas & FDM Group | I am a software developer with a background in Marine Environmental Science. I have experience in software development, quality assurance, and DevOps. I am passionate about learning new technologies and how to apply them to solve real-world problems. |Copyright © 2025 Kevin Ortiz. All Rights Reserved.|
