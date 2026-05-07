from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0009_business_provider_application'),
    ]

    operations = [
        migrations.AddField(
            model_name='beautyuser',
            name='is_suspended',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='beautyuser',
            name='suspended_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='businessprovider',
            name='is_suspended',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='businessprovider',
            name='suspended_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
    ]
