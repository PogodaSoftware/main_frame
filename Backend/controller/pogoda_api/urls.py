"""
Pogoda API URL Configuration

Registers the REST API routes for the Pogoda app using Django REST Framework's
DefaultRouter. The router automatically generates URL patterns for list and
detail views based on the registered ViewSets.

Generated Routes:
    GET /experience/      - List all work experiences
    GET /experience/{id}/ - Retrieve a single work experience
    GET /education/       - List all education entries
    GET /education/{id}/  - Retrieve a single education entry

Note: These URLs are included under the '/api/pogoda/' prefix
      in the main project URL configuration (main_frame_project/urls.py).
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkExperienceViewSet, EducationViewSet

# DefaultRouter provides automatic URL routing for ViewSets,
# including browsable API support in development mode.
router = DefaultRouter()
router.register(r'experience', WorkExperienceViewSet, basename='experience')
router.register(r'education', EducationViewSet, basename='education')

urlpatterns = [
    path('', include(router.urls)),
]
