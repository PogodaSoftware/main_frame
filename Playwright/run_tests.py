import sys
import pytest

def main():
    # Run tests in parallel across all browsers
    pytest_args = [
        "Playwright/steps",
        "--max-workers=3",  # Number of parallel workers (adjust based on your system)
        "-v",  # Verbose mode
        "--browser=chromium", 
        "--browser=firefox",
        "--browser=webkit"
    ]
    
    sys.exit(pytest.main(pytest_args))

if __name__ == "__main__":
    main()