import sys
import pytest

def main():
    # Run tests in parallel across all browsers
    pytest_args = [
        "Playwright/steps",
        "-v",  # Verbose mode
        "--browser=chromium", 
        "--browser=firefox",
        "--browser=webkit"
    ]
    
    sys.exit(pytest.main(pytest_args))

if __name__ == "__main__":
    main()