import pytest
from pytest_bdd import scenarios, given, then, parsers
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes
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
    
    expect(page.locator(experience_paragraph)).to_contain_text(experience)

@then(parsers.parse('it should display the experience first paragraph text "{experience_paragraph1}"'))
def verify_experience_first_paragraph(page, experience_paragraph1):
    
    expect(page.locator(experience_paragraph_1)).to_contain_text(experience_paragraph1)

@then(parsers.parse('it should display the experience second paragraph text "{experience_paragraph2}"'))
def verify_experience_second_paragraph(page, experience_paragraph2):
    
    expect(page.locator(experience_paragraph_2)).to_contain_text(experience_paragraph2)

@then(parsers.parse('it should display the experience third paragraph text "{experience_paragraph3}"'))
def verify_experience_third_paragraph(page, experience_paragraph3):
    
    expect(page.locator(experience_paragraph_3)).to_contain_text(experience_paragraph3)

@then("it should display the education icon")
def verify_education_icon(page):
    
    expect(page.locator(education_icon)).to_be_visible()

@then(parsers.parse('it should display the education text "{education}"'))
def verify_education_display_text(page, education):
    
    expect(page.locator(education_paragraph)).to_contain_text(education)

@then(parsers.parse('it should display the education first paragraph text "{education_paragraph1}"'))
def verify_education_first_paragraph(page, education_paragraph1):
    
    expect(page.locator(education_paragraph_1)).to_contain_text(education_paragraph1)

@then(parsers.parse('it should display the education second paragraph text "{education_paragraph2}"'))
def verify_education_second_paragraph(page, education_paragraph2):
    
    expect(page.locator(education_paragraph_2)).to_contain_text(education_paragraph2)

@then(parsers.parse('it should display the introduction text "{intro}"'))
def verify_introduction_text(page, intro):
    
    expect(page.locator(introduction_text)).to_contain_text(intro)

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