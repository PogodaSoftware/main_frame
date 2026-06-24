from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0027_beautyprovider_timezone_blank'),
    ]

    operations = [
        migrations.AddField(
            model_name='beautyuser',
            name='city',
            field=models.CharField(blank=True, default='', max_length=128),
        ),
    ]
