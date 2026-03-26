"""
Pogoda API Views

Defines read-only API endpoints for serving Pogoda's professional data.
All endpoints are rate-limited to prevent scraping and abuse.

ViewSets:
    - WorkExperienceViewSet: GET /api/pogoda/experience/
    - EducationViewSet: GET /api/pogoda/education/
"""

from rest_framework import viewsets
from rest_framework.throttling import AnonRateThrottle
from .models import WorkExperience, Education
from .serializers import WorkExperienceSerializer, EducationSerializer


class WorkExperienceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API endpoint for work experience data.

    Provides list and detail views for WorkExperience records.
    Results are ordered by the 'order' field (defined in the model's Meta).
    Rate-limited to 10 requests/minute per IP via AnonRateThrottle.

    Endpoints:
        GET /api/pogoda/experience/      - List all work experiences
        GET /api/pogoda/experience/{id}/  - Retrieve a single work experience

    Returns:
        JSON array/object with fields: id, company, role, period, location,
        description, technologies, order.
    """
    queryset = WorkExperience.objects.all()
    serializer_class = WorkExperienceSerializer
    throttle_classes = [AnonRateThrottle]


class EducationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only API endpoint for education data.

    Provides list and detail views for Education records.
    Results are ordered by the 'order' field (defined in the model's Meta).
    Rate-limited to 10 requests/minute per IP via AnonRateThrottle.

    Endpoints:
        GET /api/pogoda/education/      - List all education entries
        GET /api/pogoda/education/{id}/  - Retrieve a single education entry

    Returns:
        JSON array/object with fields: id, institution, degree, period,
        location, order.
    """
    queryset = Education.objects.all()
    serializer_class = EducationSerializer
    throttle_classes = [AnonRateThrottle]
