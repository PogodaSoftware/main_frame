from django.urls import path
from .views import BffBeautyResolveView

urlpatterns = [
    path('beauty/resolve/', BffBeautyResolveView.as_view(), name='bff-beauty-resolve'),
]
