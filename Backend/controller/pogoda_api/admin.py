from django.contrib import admin
from .models import WorkExperience, Education


@admin.register(WorkExperience)
class WorkExperienceAdmin(admin.ModelAdmin):
    list_display = ['role', 'company', 'period', 'location', 'order']
    list_editable = ['order']
    ordering = ['order']


@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    list_display = ['degree', 'institution', 'period', 'location', 'order']
    list_editable = ['order']
    ordering = ['order']
