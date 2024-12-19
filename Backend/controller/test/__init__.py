

import pytest

from main_frame.Backend.controller import main_frame_project
from main_frame.Backend.controller.test import hello


[pytest]

DJANGO_SETTINGS_MODULE = main_frame_project.settings
python_files = hello.py