import pytest
from pytest_bdd import scenarios, given, then, parsers
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing
from Playwright.pages.kevin.navigation_bar import *
from Playwright.pages.kevin.about_page import *
from Playwright.pages.kevin.footer_bar import *


scenarios("../features/Kevin/kevin_about_page.feature")

@pytest.fixture
@given("I navigate to kevin home page")
def navigate_to_kevin_about_page(page):
    selecting_different_routes(page, 'kevin')

@then("I click on the about link in the navigation bar")    
def click_about_link(page):
    page.locator(about_button).click()


@then("it should display the experience icon")
def verify_experience_icon(page):
    
    expect(page.locator(experience_icon)).to_be_visible()

@then(parsers.parse('it should display the experience display text "{experience}"'))
def verify_experience_display_text(page, experience):
 expect(page.locator("#about")).to_contain_text("3 + years Software Developer")
   

@then(parsers.parse('it should display the experience first paragraph text "{experience_paragraph1}"'))
def verify_experience_first_paragraph(page, experience_paragraph1):
    
 expect(page.locator("#about")).to_contain_text("2 + years Quality Assurance Engineer")


@then(parsers.parse('it should display the experience second paragraph text "{experience_paragraph2}"'))
def verify_experience_second_paragraph(page, experience_paragraph2):
    
    expect(page.locator("#about")).to_contain_text("B.Sc. in Marine Environmental Science")
    
@then(parsers.parse('it should display the experience third paragraph text "{experience_paragraph3}"'))
def verify_experience_third_paragraph(page, experience_paragraph3):
    
    expect(page.locator("#about")).to_contain_text("Software Engineering training at Perscholas")

@then("it should display the education icon")
def verify_education_icon(page):
    
    expect(page.locator(education_icon)).to_be_visible()

@then(parsers.parse('it should display the education text "{education}"'))
def verify_education_display_text(page, education):
    
        expect(page.locator("#about")).to_contain_text("Quality Assurance training at FDM Group")

@then(parsers.parse('it should display the education first paragraph text "{education_paragraph1}"'))
def verify_education_first_paragraph(page, education_paragraph1):
    
    expect(page.locator(education_paragraph_1)).to_contain_text(education_paragraph1)

@then(parsers.parse('it should display the education second paragraph text "{education_paragraph2}"'))
def verify_education_second_paragraph(page, education_paragraph2):
    
    expect(page.locator(education_paragraph_2)).to_contain_text(education_paragraph2)

@then(parsers.parse('it should display the introduction text "{intro}"'))
def verify_introduction_text(page, intro):
  expect(page.locator("#about")).to_contain_text("I am a dynamic and detail-oriented Quality Assurance Engineer with a robust background in software testing, DevOps, cloud infrastructure, and full-stack development. With experience leading QA teams and collaborating across cross-functional Agile environments, I bring a proven ability to drive quality and efficiency in both manual and automated testing.")
  expect(page.locator("#about")).to_contain_text("I have hands-on experience with Selenium, Playwright, TestNG, Cucumber, and a variety of DevOps tools, including Docker, Kubernetes, Terraform, Jenkins, and Azure. I have demonstrated expertise in orchestrating containerized applications, building resilient cloud solutions, and automating infrastructure deployment. My QA leadership at FDM Group and analytical contributions at TD Bank reflect my strong technical insight and effective communication skills.")
  expect(page.locator("#about")).to_contain_text("As a U.S. Navy veteran and a SUNY Maritime graduate, I bring a solid foundation in leadership, discipline, and teamwork. With continuous upskilling in Salesforce, Java, Python, React, and mobile/app testing platforms, I remain committed to innovation and excellence in software quality engineering.")

@then("it should display the Home button")
def verify_home_button(page):
    
    expect(page.locator(home_button)).to_be_visible()

@then("it should display the About section")
def verify_about_section(page):
    
    expect(page.locator(about_button)).to_be_visible()

@then("it should display the Experience section")
def verify_experience_section(page):
    
    expect(page.locator(experience_button)).to_be_visible()

@then("it should display the Projects section")
def verify_projects_section(page):
    
    expect(page.locator(projects_button)).to_be_visible()

@then("it should display the Contacts section")
def verify_contacts_section(page):
    
    expect(page.locator(contacts_button)).to_be_visible()

@then(parsers.parse('it should display the Footer section "{copyright}"'))
def verify_footer(page, copyright):
    
    expect(page.locator(copyright_text)).to_contain_text(copyright)