import sys
import os
import pytest
import django

def main():
    workspace_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if workspace_root not in sys.path:
        sys.path.insert(0, workspace_root)

    pytest_args = ["Playwright/steps"] + sys.argv[1:]

    sys.exit(pytest.main(pytest_args))

if __name__ == "__main__":
    main()
