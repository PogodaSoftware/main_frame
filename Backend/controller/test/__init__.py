import pytest


from Backend.controller import main_frame_project
from Backend.controller.test import hello

[pytest]

DJANGO_SETTINGS_MODULE = main_frame_project.Backend.controller.main_frame_project.settings
python_files = hello.py