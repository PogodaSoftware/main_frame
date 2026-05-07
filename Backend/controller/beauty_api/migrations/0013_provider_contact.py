from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0012_price_dollars'),
    ]

    operations = [
        migrations.AddField(
            model_name='businessprovider',
            name='public_email',
            field=models.EmailField(blank=True, default='', max_length=254),
        ),
        migrations.AddField(
            model_name='businessprovider',
            name='contact_phone',
            field=models.CharField(blank=True, default='', max_length=32),
        ),
        migrations.AddField(
            model_name='businessprovider',
            name='show_phone_publicly',
            field=models.BooleanField(default=False),
        ),
    ]
