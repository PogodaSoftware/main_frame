from datetime import datetime, timedelta, timezone

from django.db import migrations, models


SEED_PROVIDERS = [
    {
        'name': 'Glow Beauty Studio',
        'short_description': 'Skincare, facials, and waxing in midtown.',
        'long_description': 'Glow Beauty Studio specializes in customized facials, brow shaping, and full-face waxing. Our licensed estheticians use clean, plant-based products.',
        'location_label': '218 W 35th St, NYC',
        'services': [
            ('beauty', 'Signature Facial', 'A 60-min cleanse, exfoliate & mask treatment.', 9500, 60),
            ('beauty', 'Brow Shaping', 'Precision waxing & tint.', 4500, 30),
        ],
    },
    {
        'name': 'Lash Lab NYC',
        'short_description': 'Volume and classic lash extensions.',
        'long_description': 'Lash Lab NYC offers classic, hybrid, and volume eyelash extensions. Our techs are certified and use medical-grade adhesives.',
        'location_label': '88 Bleecker St, NYC',
        'services': [
            ('lashes', 'Classic Lash Set', 'Full set of natural classic lashes.', 14000, 90),
            ('lashes', 'Volume Fill', 'Two-week volume lash fill.', 7500, 60),
        ],
    },
    {
        'name': 'The Nail Bar',
        'short_description': 'Gel manicures, pedicures, and nail art.',
        'long_description': 'The Nail Bar is a boutique nail salon offering gel manicures, deluxe pedicures, and custom nail art. Walk-ins welcome.',
        'location_label': '450 5th Ave, NYC',
        'services': [
            ('nails', 'Gel Manicure', 'Long-lasting gel manicure.', 5500, 45),
            ('nails', 'Deluxe Pedicure', 'Spa pedicure with massage.', 7000, 60),
            ('nails', 'Custom Nail Art', 'Hand-painted custom designs.', 9000, 75),
        ],
    },
    {
        'name': 'Studio Muse Makeup',
        'short_description': 'Bridal and event makeup artists.',
        'long_description': 'Studio Muse Makeup books bridal, event, and editorial makeup with our team of certified artists. Trial sessions available.',
        'location_label': '1010 Broadway, NYC',
        'services': [
            ('makeup', 'Event Makeup', 'Full glam look for any event.', 15000, 75),
            ('makeup', 'Bridal Trial', 'Bridal trial session, 90 min.', 18000, 90),
        ],
    },
]


def seed_demo_data(apps, schema_editor):
    BeautyProvider = apps.get_model('beauty_api', 'BeautyProvider')
    BeautyService = apps.get_model('beauty_api', 'BeautyService')

    for entry in SEED_PROVIDERS:
        provider, _ = BeautyProvider.objects.update_or_create(
            name=entry['name'],
            defaults={
                'short_description': entry['short_description'],
                'long_description': entry['long_description'],
                'location_label': entry['location_label'],
            },
        )
        for cat, name, desc, price, dur in entry['services']:
            BeautyService.objects.update_or_create(
                provider=provider,
                name=name,
                defaults={
                    'category': cat,
                    'description': desc,
                    'price_cents': price,
                    'duration_minutes': dur,
                },
            )


def unseed_demo_data(apps, schema_editor):
    BeautyProvider = apps.get_model('beauty_api', 'BeautyProvider')
    names = [e['name'] for e in SEED_PROVIDERS]
    BeautyProvider.objects.filter(name__in=names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0003_beautyfeatureflag_beautyflagaudit'),
    ]

    operations = [
        migrations.CreateModel(
            name='BeautyProvider',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('short_description', models.CharField(blank=True, default='', max_length=255)),
                ('long_description', models.TextField(blank=True, default='')),
                ('location_label', models.CharField(blank=True, default='', max_length=255)),
                ('business_provider_id', models.IntegerField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'beauty_providers', 'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='BeautyService',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('category', models.CharField(choices=[('beauty', 'Beauty'), ('lashes', 'Lashes'), ('nails', 'Nails'), ('makeup', 'Makeup')], max_length=32)),
                ('name', models.CharField(max_length=255)),
                ('description', models.CharField(blank=True, default='', max_length=255)),
                ('price_cents', models.IntegerField(default=0)),
                ('duration_minutes', models.IntegerField(default=60)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('provider', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='services', to='beauty_api.beautyprovider')),
            ],
            options={'db_table': 'beauty_services', 'ordering': ['provider__name', 'name']},
        ),
        migrations.AddIndex(
            model_name='beautyservice',
            index=models.Index(fields=['category'], name='beauty_svc_cat_idx'),
        ),
        migrations.AddIndex(
            model_name='beautyservice',
            index=models.Index(fields=['provider', 'category'], name='beauty_svc_prov_cat_idx'),
        ),
        migrations.CreateModel(
            name='BeautyBooking',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slot_at', models.DateTimeField()),
                ('status', models.CharField(choices=[('booked', 'Booked'), ('cancelled', 'Cancelled'), ('completed', 'Completed')], default='booked', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='bookings', to='beauty_api.beautyuser')),
                ('service', models.ForeignKey(on_delete=models.deletion.PROTECT, related_name='bookings', to='beauty_api.beautyservice')),
            ],
            options={'db_table': 'beauty_bookings', 'ordering': ['-slot_at']},
        ),
        migrations.AddIndex(
            model_name='beautybooking',
            index=models.Index(fields=['customer', '-slot_at'], name='beauty_bk_cust_slot_idx'),
        ),
        migrations.AddIndex(
            model_name='beautybooking',
            index=models.Index(fields=['service', 'slot_at'], name='beauty_bk_svc_slot_idx'),
        ),
        migrations.RunPython(seed_demo_data, unseed_demo_data),
    ]
