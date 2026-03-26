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
    And it should display the education third paragraph text "<education-paragraph3>"
    And it should display the introduction text "<intro>"
    And it should display the Home button
    And it should display the About section
    And it should display the Experience section
    And it should display the Projects section
    And it should display the Contacts section
    And it should display the Footer section "<copyright>"

    Examples:
      | experience | experience-paragraph1        | experience-paragraph2                | experience-paragraph3      | education | education-paragraph1                  | education-paragraph2                   | education-paragraph3                 | intro                                                                                                                                                                                                                                                      |copyright|
      | Experience | 3 + years Software Developer | 2 + years Quality Assurance Engineer | 3 + months DevOps Engineer | Education | B.Sc. in Marine Environmental Science | Software Engineering training at Perscholas | Quality Assurance training at FDM Group |I am a dynamic and detail-oriented Quality Assurance Engineer with a robust background in software testing, DevOps, cloud infrastructure, and full-stack development. With experience leading QA teams and collaborating across cross-functional Agile environments, I bring a proven ability to drive quality and efficiency in both manual and automated testing. I have hands-on experience with Selenium, Playwright, TestNG, Cucumber, and a variety of DevOps tools, including Docker, Kubernetes, Terraform, Jenkins, and Azure. I have demonstrated expertise in orchestrating containerized applications, building resilient cloud solutions, and automating infrastructure deployment. My QA leadership at FDM Group and analytical contributions at TD Bank reflect my strong technical insight and effective communication skills. As a U.S. Navy veteran and a SUNY Maritime graduate, I bring a solid foundation in leadership, discipline, and teamwork. With continuous upskilling in Salesforce, Java, Python, React, and mobile/app testing platforms, I remain committed to innovation and excellence in software quality engineering. |Copyright © 2025 Kevin Ortiz. All Rights Reserved.|

