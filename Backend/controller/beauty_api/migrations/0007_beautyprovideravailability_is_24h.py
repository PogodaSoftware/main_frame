from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0006_beauty_provider_availability'),
    ]

    operations = [
        migrations.AddField(
            model_name='beautyprovideravailability',
            name='is_24h',
            field=models.BooleanField(default=False),
        ),
    ]
