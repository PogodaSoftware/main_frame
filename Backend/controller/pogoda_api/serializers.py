"""
Pogoda API Serializers

Converts Django model instances to JSON for the REST API responses.
Each serializer defines which model fields are exposed via the API.
"""

from rest_framework import serializers
from .models import WorkExperience, Education


class WorkExperienceSerializer(serializers.ModelSerializer):
    """
    Serializer for the WorkExperience model.

    Converts WorkExperience instances to JSON format for API responses.
    Exposes all user-facing fields while excluding auto-generated timestamps
    (created_at, updated_at) from the API output.

    Serialized Fields:
        id, company, role, period, location, description, technologies, order
    """
    class Meta:
        model = WorkExperience
        fields = ['id', 'company', 'role', 'period', 'location', 'description', 'technologies', 'order']


class EducationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Education model.

    Converts Education instances to JSON format for API responses.
    Exposes all user-facing fields while excluding auto-generated timestamps
    (created_at, updated_at) from the API output.

    Serialized Fields:
        id, institution, degree, period, location, order
    """
    class Meta:
        model = Education
        fields = ['id', 'institution', 'degree', 'period', 'location', 'order']
