"""
Main Project URL Configuration

Root URL configuration for the Django backend. Maps top-level URL prefixes
to their respective app URL configurations.

Routes:
    /admin/        - Django admin interface for managing database records
    /api/pogoda/   - REST API endpoints for Pogoda's experience and education data
                     (delegated to pogoda_api.urls)

For more information, see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/pogoda/', include('pogoda_api.urls')),
    path('api/beauty/', include('beauty_api.urls')),
    path('api/bff/', include('bff_api.urls')),
]
