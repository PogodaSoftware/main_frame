import os
from playwright.sync_api import sync_playwright, Page

frontend_port = os.getenv('FRONTEND_PORT')

def selecting_different_routes(page: Page, route: str):
    if route == 'kevin':
        page.goto(f"http://localhost:{frontend_port}/kevin")
    elif route == 'pogoda':
        page.goto(f"http://localhost:{frontend_port}/pogoda")
    else:
        raise ValueError(f"Unknown route: {route}")

def timeout_for_testing(page: Page):
    page.wait_for_timeout(3000)