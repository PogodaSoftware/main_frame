from rest_framework import viewsets
from rest_framework.throttling import AnonRateThrottle
from .models import WorkExperience, Education
from .serializers import WorkExperienceSerializer, EducationSerializer


class WorkExperienceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WorkExperience.objects.all()
    serializer_class = WorkExperienceSerializer
    throttle_classes = [AnonRateThrottle]


class EducationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Education.objects.all()
    serializer_class = EducationSerializer
    throttle_classes = [AnonRateThrottle]
