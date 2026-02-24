"""
Pogoda API Data Models

Defines the database schema for Jaroslaw Pogoda's professional portfolio data.
These models store work experience and education records that are served
via the REST API to the Angular frontend.

Models:
    - WorkExperience: Professional work history entries
    - Education: Academic and certification records
"""

from django.db import models


class WorkExperience(models.Model):
    """
    Represents a single professional work experience entry.

    Stores job details including company name, role, time period, location,
    job description bullet points, and technologies used. Entries are ordered
    by the 'order' field to control display sequence on the frontend.

    Attributes:
        company (str): Name of the employer or organization.
        role (str): Job title or position held.
        period (str): Employment date range (e.g., '2022 - Present').
        location (str): Geographic location of the position.
        description (list[str]): JSON array of responsibility/achievement bullet points.
        technologies (list[str]): JSON array of technologies and skills used in this role.
        order (int): Display order on the frontend (lower numbers appear first).
        created_at (datetime): Timestamp when the record was created (auto-set).
        updated_at (datetime): Timestamp when the record was last modified (auto-set).
    """
    company = models.CharField(max_length=200)
    role = models.CharField(max_length=200)
    period = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    description = models.JSONField()
    technologies = models.JSONField(default=list, blank=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
        verbose_name_plural = 'Work Experiences'

    def __str__(self):
        """Returns a human-readable string representation of the work experience."""
        return f"{self.role} at {self.company}"


class Education(models.Model):
    """
    Represents an academic or certification education entry.

    Stores educational institution details, degree/certification earned,
    time period, and location. Entries are ordered by the 'order' field.

    Attributes:
        institution (str): Name of the school, university, or certifying body.
        degree (str): Degree or certification title earned.
        period (str): Date range of attendance (e.g., '2010 - 2016').
        location (str): Geographic location of the institution.
        order (int): Display order on the frontend (lower numbers appear first).
        created_at (datetime): Timestamp when the record was created (auto-set).
        updated_at (datetime): Timestamp when the record was last modified (auto-set).
    """
    institution = models.CharField(max_length=200)
    degree = models.CharField(max_length=200)
    period = models.CharField(max_length=100)
    location = models.CharField(max_length=200)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
        verbose_name_plural = 'Education'

    def __str__(self):
        """Returns a human-readable string representation of the education entry."""
        return f"{self.degree} from {self.institution}"
