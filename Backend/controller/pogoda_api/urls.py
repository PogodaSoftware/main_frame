from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkExperienceViewSet, EducationViewSet

router = DefaultRouter()
router.register(r'experience', WorkExperienceViewSet, basename='experience')
router.register(r'education', EducationViewSet, basename='education')

urlpatterns = [
    path('', include(router.urls)),
]
