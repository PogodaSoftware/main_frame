from datetime import time

from django.db import migrations, models


# Mon-Sat 10:00-18:00, Sunday closed by default.
DEFAULT_HOURS_BY_DOW = {
    0: (time(10, 0), time(18, 0), False),  # Monday
    1: (time(10, 0), time(18, 0), False),
    2: (time(10, 0), time(18, 0), False),
    3: (time(10, 0), time(18, 0), False),
    4: (time(10, 0), time(18, 0), False),
    5: (time(10, 0), time(18, 0), False),  # Saturday
    6: (time(0, 0),  time(0, 0),  True),   # Sunday closed
}


def seed_default_availability(apps, schema_editor):
    BeautyProvider = apps.get_model('beauty_api', 'BeautyProvider')
    BeautyProviderAvailability = apps.get_model('beauty_api', 'BeautyProviderAvailability')

    for provider in BeautyProvider.objects.all():
        for dow, (start, end, closed) in DEFAULT_HOURS_BY_DOW.items():
            BeautyProviderAvailability.objects.update_or_create(
                provider=provider,
                day_of_week=dow,
                defaults={
                    'start_time': start,
                    'end_time': end,
                    'is_closed': closed,
                },
            )


def unseed_default_availability(apps, schema_editor):
    BeautyProviderAvailability = apps.get_model('beauty_api', 'BeautyProviderAvailability')
    BeautyProviderAvailability.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0005_replace_categories'),
    ]

    operations = [
        migrations.CreateModel(
            name='BeautyProviderAvailability',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('day_of_week', models.IntegerField(help_text='0=Mon, 6=Sun')),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('is_closed', models.BooleanField(default=False)),
                ('provider', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='availability', to='beauty_api.beautyprovider')),
            ],
            options={
                'db_table': 'beauty_provider_availability',
                'ordering': ['provider__name', 'day_of_week'],
            },
        ),
        migrations.AddConstraint(
            model_name='beautyprovideravailability',
            constraint=models.UniqueConstraint(fields=('provider', 'day_of_week'), name='beauty_avail_unique_dow'),
        ),
        migrations.RunPython(seed_default_availability, unseed_default_availability),
    ]
