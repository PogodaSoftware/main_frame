from django.db import models

class WorkExperience(models.Model):
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
        return f"{self.role} at {self.company}"


class Education(models.Model):
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
        return f"{self.degree} from {self.institution}"
