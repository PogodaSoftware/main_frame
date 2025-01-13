import os
from playwright.sync_api import sync_playwright
frontend_port = os.getenv('FRONTEND_PORT')


def page():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page()
        yield page
        browser.close()
def selecting_different_routes(page, route):
    if route == 'kevin':
        page.goto(f"http://localhost:{frontend_port}/kevin")
    elif route == 'pogoda':
        page.goto(f"http://localhost:{frontend_port}/pogoda")
    else:
        raise ValueError(f"Unknown route: {route}")
 
 