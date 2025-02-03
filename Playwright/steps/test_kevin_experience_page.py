import pytest
from pytest_bdd import scenarios, given, then, when
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes
from Playwright.pages.kevin.navigation_bar import *


scenarios("../features/Kevin/experience.feature")

@pytest.fixture
@given("I navigate to kevin home page")
def navigate_to_kevin_about_page(page):
    selecting_different_routes(page, 'kevin')

@when("I click on the Experience link")    
def click_experience_link(page):
    page.locator(experience_button).click()
    page.wait_for_timeout(1000)

@then("it should display all of my current Experience")
def verify_experience_text(page):
    expect(page.locator("h1")).to_contain_text("Exerience")
    expect(page.locator("app-home")).to_contain_text("Languages")
    expect(page.locator("app-home")).to_contain_text("HTML5")
    expect(page.locator("app-home")).to_contain_text("JavaScript")
    expect(page.locator("app-home")).to_contain_text("Python")
    expect(page.locator("app-home")).to_contain_text("CSS3")
    expect(page.locator("app-home")).to_contain_text("SQL")
    expect(page.locator("app-home")).to_contain_text("Java")
    expect(page.locator("app-home")).to_contain_text("Frameworks")
    expect(page.locator("app-home")).to_contain_text("Salesforce Admin")
    expect(page.locator("app-home")).to_contain_text("YAML")
    expect(page.locator("app-home")).to_contain_text("Angular")
    expect(page.locator("app-home")).to_contain_text("React")
    expect(page.locator("app-home")).to_contain_text("Spring Framework")
    expect(page.locator("app-home")).to_contain_text("Salesforce Developer")
    expect(page.locator("app-home")).to_contain_text("Database and Tools")
    expect(page.locator("app-home")).to_contain_text("MySQL")
    expect(page.locator("app-home")).to_contain_text("Android Studio")
    expect(page.locator("app-home")).to_contain_text("Confluence")
    expect(page.locator("app-home")).to_contain_text("MongoDB")
    expect(page.locator("app-home")).to_contain_text("Azure")
    expect(page.locator("app-home")).to_contain_text("TensorFlow")
    expect(page.locator("app-home")).to_contain_text("Testing")
    expect(page.locator("app-home")).to_contain_text("TestNG")
    expect(page.locator("app-home")).to_contain_text("JUnit")
    expect(page.locator("app-home")).to_contain_text("Playwright")
    expect(page.locator("app-home")).to_contain_text("Appium Testing")
    expect(page.locator("app-home")).to_contain_text("Selenium")
    expect(page.locator("app-home")).to_contain_text("ADA Testing")
    expect(page.locator("app-home")).to_contain_text("Dev-Ops")
    expect(page.locator("app-home")).to_contain_text("GitHub Actions")
    expect(page.locator("app-home")).to_contain_text("Kubernetes")
    expect(page.locator("app-home")).to_contain_text("Terraform")
    expect(page.locator("app-home")).to_contain_text("Docker")
    expect(page.locator("app-home")).to_contain_text("Unix")
    expect(page.locator("app-home")).to_contain_text("Jira")
    expect(page.locator("app-home")).to_contain_text("General")
    expect(page.locator("app-home")).to_contain_text("Microsoft Office")
    expect(page.locator("app-home")).to_contain_text("VBA for Excel")
    expect(page.locator("app-home")).to_contain_text("Browser Stack")
    expect(page.locator("app-home")).to_contain_text("Hexawise")
    expect(page.locator("app-home")).to_contain_text("Jenkins")
    expect(page.locator("app-home")).to_contain_text("Salesforce Developer")

    
