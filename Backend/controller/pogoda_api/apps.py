"""
Pogoda API Application Configuration

Configures the pogoda_api Django app. This app provides REST API endpoints
for serving Jaroslaw Pogoda's professional experience and education data
to the Angular frontend.
"""

from django.apps import AppConfig


class PogodaApiConfig(AppConfig):
    """
    Django application configuration for the Pogoda API.

    Sets the default primary key field type to BigAutoField and registers
    the app under the name 'pogoda_api'.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pogoda_api'
