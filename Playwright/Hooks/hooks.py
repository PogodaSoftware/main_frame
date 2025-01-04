from playwright.sync_api import sync_playwright, expect
def selecting_different_routes(route):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        yield page
        browser.close()
    
    if route == 'kevin':
        page.goto("http://localhost:80/kevin")
        
    elif route == 'pogoda':
        page.goto("http://localhost:80/pogoda")