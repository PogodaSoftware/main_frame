import pytest
from playwright.sync_api import sync_playwright

from Playwright.Hooks.hooks import selecting_different_routes

@pytest.fixture(scope="function")
def browser(request):
    # Get the list of default browsers (you can add more if needed)
    browsers = ["chromium", "firefox", "webkit"]
    
    # Determine which browser to use based on request parametrization
    browser_name = request.param

    with sync_playwright() as playwright:
        if browser_name.lower() == "firefox":
            yield playwright.firefox.launch()
        elif browser_name.lower() == "webkit":
            yield playwright.webkit.launch()
        else:  # default to chromium
            yield playwright.chromium.launch()

@pytest.fixture
def page(request, browser):
    route = request.node.get_closest_marker("browser_route")
    if not route:
        raise ValueError("No browser route specified for the test")
    
    with browser.new_page() as p:
        selecting_different_routes(p, route.args[0])
        yield p