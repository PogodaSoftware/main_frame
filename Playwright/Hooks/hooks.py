import os
from playwright.sync_api import sync_playwright

def page():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=False, slow_mo=500)  # Slow down actions by 500 milliseconds
        page = browser.new_page()
        yield page
        browser.close()

def selecting_different_routes(page, route):
    frontend_port = os.get('FRONTEND_PORT')
    if not frontend_port:
        raise ValueError("FRONTEND_PORT environment variable is not set")
    
    if route == 'kevin':
        page.goto(f"http://localhost:{frontend_port}/kevin")
    elif route == 'pogoda':
        page.goto(f"http://localhost:{frontend_port}/pogoda")
    else:
        raise ValueError(f"Unknown route: {route}")