from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Collect console errors
        console_errors = []
        def handle_console(msg):
            if msg.type == "error":
                console_errors.append(msg.text)
        page.on("console", handle_console)
        
        print("Navigating to http://localhost:4200/kevin/")
        page.goto("http://localhost:4200/kevin/", wait_until="networkidle")
        
        # Take full page screenshot first
        page.screenshot(path="portfolio-full.png", full_page=True)
        print("Full page screenshot saved: portfolio-full.png")
        
        # Define sections to capture (using common text selectors)
        sections = [
            ("hero", "Kevin Ortiz"),
            ("about", "About"),
            ("timeline", "Timeline"),
            ("skills", "Skills"),
            ("projects", "Projects"),
            ("contact", "Contact")
        ]
        
        for name, text in sections:
            try:
                locator = page.get_by_text(text, exact=False).first
                locator.scroll_into_view_if_needed()
                time.sleep(0.5)  # Allow render
                locator.screenshot(path=f"portfolio-{name}.png")
                print(f"Screenshot saved: portfolio-{name}.png")
            except Exception as e:
                print(f"Could not capture {name} section: {e}")
        
        print(f"\nConsole errors found: {len(console_errors)}")
        for i, error in enumerate(console_errors[:10], 1):  # Show first 10
            print(f"{i}. {error}")
        
        browser.close()
        print("\nDone!")

if __name__ == "__main__":
    run()