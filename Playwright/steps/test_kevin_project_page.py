import pytest
from pytest_bdd import scenarios, given, when, then, parsers
from playwright.sync_api import expect
from Playwright.Hooks.hooks import selecting_different_routes, timeout_for_testing, timeout_for_testing
from Playwright.pages.kevin.navigation_bar import *


scenarios("../features/Kevin/kevin_project_page.feature")

@pytest.fixture
@given("I navigate to kevin home page")
def navigate_to_kevin_home_page(page):
    selecting_different_routes(page, 'kevin')

@when("I click on the Projects link")
def click_projects_link(page):
    page.locator(projects_button).click()

@then(parsers.parse("It should display my project header"))
def verify_project_header(page):
    expect(page.locator("h1")).to_contain_text("Browse my projects")

@then("it should display my first project image")
def verify_first_project_image(page):
    expect(page.locator("#snowmanCanvas")).to_be_visible()

@then("It should display Project One")
def verify_project_one(page):
     expect(page.get_by_role("heading", name="Snowman")).to_be_visible()

     expect(page.get_by_role("heading", name="Shark")).to_be_visible()
     expect(page.get_by_role("heading", name="SciFi Crate")).to_be_visible()

@then("it should display my first project github link")
def verify_first_project_github_link(page):
    expect(page.get_by_role("button", name="GitHub").first).to_be_visible()

@then("it should display my first project live demo link")
def verify_first_project_live_demo_link(page):
    expect(page.get_by_role("button", name="Live Demo").first).to_be_visible()

@then("it should display my second project image")
def verify_second_project_image(page):
    expect(page.locator("#sharkCanvas")).to_be_visible()

@then("it should display my second project github link")
def verify_second_project_github_link(page):
    expect(page.get_by_role("button", name="GitHub").nth(1)).to_be_visible()

@then("it should display my second project live demo link")
def verify_second_project_live_demo_link(page):
    expect(page.get_by_role("button", name="Live Demo").nth(1)).to_be_visible()

@then("it should display my third project image")
def verify_third_project_image(page):
   expect(page.locator("#scifiCrateCanvas")).to_be_visible()

@then("it should display my third project github link")
def verify_third_project_github_link(page):
    expect(page.get_by_role("button", name="GitHub").nth(2)).to_be_visible()

@then("it should display my third project live demo link")
def verify_third_project_live_demo_link(page):
    expect(page.get_by_role("button", name="Live Demo").nth(2)).to_be_visible()

    with page.expect_popup() as page1_info:
        page.get_by_role("button", name="Live Demo").first.click()
    page1 = page1_info.value
    expect(page1.locator("#canvas")).to_be_visible()
    page.goto("http://localhost/kevin/projects")
    with page.expect_popup() as page2_info:
        page.get_by_role("button", name="Live Demo").nth(1).click()
    page2 = page2_info.value
    expect(page2.locator("#canvas")).to_be_visible()
    page.goto("http://localhost/kevin/projects")
    with page.expect_popup() as page3_info:
        page.get_by_role("button", name="Live Demo").nth(2).click()
    page3 = page3_info.value
    expect(page3.locator("#canvas")).to_be_visible()
