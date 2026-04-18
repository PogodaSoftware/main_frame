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


class BusinessProvider(models.Model):
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    business_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_business_providers'

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def __str__(self):
        return f"{self.business_name} ({self.email})"


class BeautySession(models.Model):
    USER_TYPE_CUSTOMER = 'customer'
    USER_TYPE_BUSINESS = 'business'
    USER_TYPE_CHOICES = [
        (USER_TYPE_CUSTOMER, 'Customer'),
        (USER_TYPE_BUSINESS, 'Business Provider'),
    ]

    user_id = models.IntegerField()
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES)
    device_id = models.CharField(max_length=255)
    token_hash = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'beauty_sessions'
        indexes = [
            models.Index(fields=['token_hash'], name='beauty_sess_token_h_idx'),
            models.Index(fields=['user_id', 'user_type', 'device_id'], name='beauty_sess_user_dev_idx'),
        ]

    def __str__(self):
        return f"{self.user_type}:{self.user_id} @ {self.device_id}"


class BeautyFeatureFlag(models.Model):
    """
    Runtime feature flag for the Beauty BFF.

    The HateoasService consults this table on every resolve so toggling
    a flag takes effect on the next BFF call — no redeploy required.
    If a key is missing here, the env-var default is used as a fallback.
    """

    key = models.CharField(max_length=64, unique=True)
    enabled = models.BooleanField(default=True)
    description = models.CharField(max_length=255, blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)
    updated_by_user_id = models.IntegerField(null=True, blank=True)
    updated_by_email = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        db_table = 'beauty_feature_flags'

    def __str__(self):
        return f"{self.key}={'on' if self.enabled else 'off'}"


class BeautyFlagAudit(models.Model):
    """Append-only audit trail for every feature-flag change."""

    flag_key = models.CharField(max_length=64)
    old_value = models.BooleanField()
    new_value = models.BooleanField()
    changed_by_user_id = models.IntegerField(null=True, blank=True)
    changed_by_user_type = models.CharField(max_length=20, blank=True, default='')
    changed_by_email = models.CharField(max_length=255, blank=True, default='')
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_flag_audit'
        indexes = [
            models.Index(fields=['flag_key', '-changed_at'], name='beauty_flag_aud_key_idx'),
        ]
        ordering = ['-changed_at']

    def __str__(self):
        return f"{self.flag_key}: {self.old_value}->{self.new_value} @ {self.changed_at:%Y-%m-%d %H:%M}"
