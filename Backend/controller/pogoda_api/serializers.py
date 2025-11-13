from rest_framework import serializers
from .models import WorkExperience, Education


class WorkExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkExperience
        fields = ['id', 'company', 'role', 'period', 'location', 'description', 'technologies', 'order']


class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = ['id', 'institution', 'degree', 'period', 'location', 'order']
