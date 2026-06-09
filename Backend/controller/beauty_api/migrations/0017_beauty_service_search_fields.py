from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0016_flag_duplicate_role_emails'),
    ]

    operations = [
        migrations.AddField(
            model_name='beautyservice',
            name='service_locations',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='beautyservice',
            name='is_future',
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name='beautyservice',
            index=models.Index(fields=['is_future'], name='beauty_svc_future_idx'),
        ),
    ]
