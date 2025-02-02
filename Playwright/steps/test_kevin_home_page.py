import pytest
from pytest_bdd import scenarios, given, then, parsers
from playwright.sync_api import sync_playwright, expect
from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.kevin.navigation import *
from Playwright.pages.kevin.homepage import *

scenarios("../features/Kevin/kevin_home_page.feature")

@pytest.fixture

@given("I navigate to kevin home page")
def navigate_to_kevin_page(page):
    selecting_different_routes(page, 'kevin')  

@then(parsers.parse('it should display my name "{name}"'))
def verify_name_displayed(page, name):
    
    expect(page.locator(name_text)).to_contain_text(name)


@then(parsers.parse('it should display my credentials "{credentials}"'))
def verify_credentialsDisplayed(page, credentials):

     expect(page.locator(credentials_text)).to_contain_text(credentials)

@then("it should display my profile picture")
def verify_profile_picture(page):
    expect(page.locator(profile_picture)).to_be_visible()

@then("it should display the Download CV button")
def verify_download_cv_button(page):
     expect(page.locator(download_cv_button)).to_be_visible()


@then("it should display the Contact Me button")
def verify_contact_me_button(page):
    expect(page.locator(contact_me_button)).to_be_visible()


@then("it should display the LinkedIn icon")
def verify_linkedin_icon(page):
    expect(page.locator(linkedin_button)).to_be_visible()


@then("it should display the GitHub icon")
def verify_github_icon(page):
    expect(page.locator(github_button)).to_be_visible() 
    
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
def verify_footer(page,copyright):
    expect(page.locator(copyright_text)).to_contain_text(copyright)