import os

from django.db import migrations, models


def _env_default(name: str, default: bool) -> bool:
    """Mirror hateoas_service._env_flag so seeding inherits current env behaviour."""
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() not in ('0', 'false', 'off', 'no', '')


def seed_default_flags(apps, schema_editor):
    """
    Seed each registered flag, inheriting the value the previous env-var
    behaviour would have produced. This avoids regressing environments
    where an operator had explicitly disabled a flag via the old env var
    — the new DB row keeps that same disabled state.
    """
    BeautyFeatureFlag = apps.get_model('beauty_api', 'BeautyFeatureFlag')
    defaults = [
        ('BEAUTY_BUSINESS_LOGIN_ENABLED', True, 'Show the Business Provider sign-in entry point.'),
        ('BEAUTY_SIGNUP_ENABLED', True, 'Allow new customer sign-ups.'),
    ]
    for key, fallback, desc in defaults:
        BeautyFeatureFlag.objects.update_or_create(
            key=key,
            defaults={'enabled': _env_default(key, fallback), 'description': desc},
        )


def unseed_default_flags(apps, schema_editor):
    BeautyFeatureFlag = apps.get_model('beauty_api', 'BeautyFeatureFlag')
    BeautyFeatureFlag.objects.filter(
        key__in=['BEAUTY_BUSINESS_LOGIN_ENABLED', 'BEAUTY_SIGNUP_ENABLED']
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0002_businessprovider_beautysession'),
    ]

    operations = [
        migrations.CreateModel(
            name='BeautyFeatureFlag',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=64, unique=True)),
                ('enabled', models.BooleanField(default=True)),
                ('description', models.CharField(blank=True, default='', max_length=255)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by_user_id', models.IntegerField(blank=True, null=True)),
                ('updated_by_email', models.CharField(blank=True, default='', max_length=255)),
            ],
            options={'db_table': 'beauty_feature_flags'},
        ),
        migrations.CreateModel(
            name='BeautyFlagAudit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('flag_key', models.CharField(max_length=64)),
                ('old_value', models.BooleanField()),
                ('new_value', models.BooleanField()),
                ('changed_by_user_id', models.IntegerField(blank=True, null=True)),
                ('changed_by_user_type', models.CharField(blank=True, default='', max_length=20)),
                ('changed_by_email', models.CharField(blank=True, default='', max_length=255)),
                ('changed_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'beauty_flag_audit',
                'ordering': ['-changed_at'],
            },
        ),
        migrations.AddIndex(
            model_name='beautyflagaudit',
            index=models.Index(fields=['flag_key', '-changed_at'], name='beauty_flag_aud_key_idx'),
        ),
        migrations.RunPython(seed_default_flags, unseed_default_flags),
    ]
