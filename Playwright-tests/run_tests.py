import os
import sys
import django
import pytest

def main():
    os.environ.setdefault(
        'DJANGO_SETTINGS_MODULE', 
        'Backend.controller.main_frame_project.settings'
    )

    print(f"DJANGO_SETTINGS_MODULE: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
    print(f"PYTHONPATH: {os.environ.get('PYTHONPATH')}")

    # Setup Django
    try:
        django.setup()
        print("Django setup completed successfully.")
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # Ensure test-results directory exists
    os.makedirs("Playwright-tests/test-results", exist_ok=True)

    pytest_args = [
        "Playwright-tests/test_homePage.py",
        "Playwright-tests/test_second_test.py",
        "--json-report",  # Enable JSON reporting
        "--json-report-file=Playwright-tests/test-results/results.json"  # Save to specific file
    ]
    print(f"Running pytest with arguments: {pytest_args}")
    
    sys.exit(pytest.main(pytest_args))

if __name__ == "__main__":
    main()
