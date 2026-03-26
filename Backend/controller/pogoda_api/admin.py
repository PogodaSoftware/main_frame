"""
Pogoda API Admin Configuration

Registers WorkExperience and Education models with Django's admin interface.
Provides inline editing for display order and organized list views for
managing portfolio data through the admin panel.

Admin URL: /admin/
"""

from django.contrib import admin
from .models import WorkExperience, Education


@admin.register(WorkExperience)
class WorkExperienceAdmin(admin.ModelAdmin):
    """
    Admin configuration for WorkExperience model.

    Displays role, company, period, location, and order in the list view.
    The 'order' field is editable directly from the list view for quick
    reordering of experience entries without opening each record.
    """
    list_display = ['role', 'company', 'period', 'location', 'order']
    list_editable = ['order']
    ordering = ['order']


@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    """
    Admin configuration for Education model.

    Displays degree, institution, period, location, and order in the list view.
    The 'order' field is editable directly from the list view for quick
    reordering of education entries without opening each record.
    """
    list_display = ['degree', 'institution', 'period', 'location', 'order']
    list_editable = ['order']
    ordering = ['order']
