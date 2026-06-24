from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0025_beauty_chat_reads'),
    ]

    operations = [
        migrations.AddField(
            model_name='beautyprovider',
            name='timezone',
            field=models.CharField(default='UTC', max_length=64),
        ),
    ]
