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

    try:
        django.setup()
        print("Django setup completed successfully.")
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    os.makedirs("Playwright-tests/test-results", exist_ok=True)

    pytest_args = [
        "Playwright-tests/steps"
    ]
    print(f"Running pytest with arguments: {pytest_args}")
    
    sys.exit(pytest.main(pytest_args))

if __name__ == "__main__":
    main()