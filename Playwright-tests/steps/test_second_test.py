from playwright.sync_api import sync_playwright, expect
def test_page_content():
    with sync_playwright() as playwright:
        # Launch the browser in non-headless mode with a delay
        browser = playwright.chromium.launch
        page = browser.new_page()

        # Navigate to the target URL
        page.goto("http://localhost:80/pogoda")

        # Locate the element and use Playwright's expect for assertions
        locator = page.locator("xpath=/html/body/app-root/app-home/p")
        expect(locator).to_have_text("Pogoda home works111!")

