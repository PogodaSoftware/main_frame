from playwright.sync_api import sync_playwright, expect
def test_page_content():
    with sync_playwright() as playwright:
        
        browser = playwright.chromium.launch()
        page = browser.new_page()

        
        page.goto("http://localhost:80/kevin")

        
        locator = page.locator("xpath=/html/body/app-root/app-home/p")
        expect(locator).to_have_text("Kevin home works! test testing!!!!!!!!!!")

