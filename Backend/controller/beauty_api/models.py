from django.db import models
from django.contrib.auth.hashers import make_password


class BeautyUser(models.Model):
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_users'

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def __str__(self):
        return self.email
