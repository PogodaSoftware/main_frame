import sys
import pytest
import django

def main():

    pytest_args = [
        "Playwright/steps/*.py"
    ]
    
    sys.exit(pytest.main(pytest_args))

if __name__ == "__main__":
    main()