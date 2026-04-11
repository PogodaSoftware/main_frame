import os
import subprocess

BACKEND_PORT = os.getenv('BACKEND_PORT', '8000')
BACKEND_URL = f"http://localhost:{BACKEND_PORT}"
TEST_DEVICE_ID = "test-device-playwright-beauty-001"

_MANAGE_PY_DIR = os.path.join(
    os.path.dirname(__file__), '..', '..', '..', 'Backend', 'controller'
)


def delete_test_users(email: str) -> None:
    cmd = (
        "from beauty_api.models import BeautyUser, BusinessProvider; "
        f"BeautyUser.objects.filter(email='{email}').delete(); "
        f"BusinessProvider.objects.filter(email='{email}').delete()"
    )
    subprocess.run(
        ["python", "manage.py", "shell", "-c", cmd],
        cwd=os.path.abspath(_MANAGE_PY_DIR),
        capture_output=True,
        timeout=30,
    )
