import os
import sys
import django
import pytest

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'main_frame_project.settings')  

    try:
        django.setup()
    except ImportError as exc:
        raise ImportError(
            # "Couldn't import Django. Are you sure it's installed and "
            # "available on your PYTHONPATH environment variable? Did you "
            # "forget to activate a virtual environment?"
        ) from exc

    pytest_args = [
       "Playwright-tests/test_homepage.py",
       "Playwright-tests/test_second_test.py"       
        
    ]
    
    sys.exit(pytest.main(pytest_args))

if __name__ == "__main__":
    main()
