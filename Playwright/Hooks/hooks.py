import os
from playwright.sync_api import sync_playwright

FRONTEND_PORT = os.environ["FRONTEND_PORT"]

    
def page():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=False, slow_mo=500)  # Slow down actions by 500 milliseconds
        page = browser.new_page()
        yield page
        browser.close()

def selecting_different_routes(page, route):
    
    if route == 'kevin':
        page.goto(f"http://localhost:{FRONTEND_PORT}/kevin")
    elif route == 'pogoda':
        page.goto(f"http://localhost:{FRONTEND_PORT}/pogoda")
    else:
        raise ValueError(f"Unknown route: {route}")