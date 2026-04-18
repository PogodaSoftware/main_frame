from django.db import migrations, models


NEW_PROVIDERS = [
    {
        'name': 'Glow Facial Studio',
        'short_description': 'Custom facials and skin treatments in midtown.',
        'long_description': 'Glow Facial Studio specializes in customized facials, brightening peels, and full-face waxing. Our licensed estheticians use clean, plant-based products.',
        'location_label': '218 W 35th St, NYC',
        'services': [
            ('facial', 'Signature Facial', 'A 60-min cleanse, exfoliate & mask treatment.', 9500, 60),
            ('facial', 'Brightening Peel', 'Glycolic peel for an even tone.', 12000, 45),
        ],
    },
    {
        'name': 'Serenity Massage',
        'short_description': 'Therapeutic and relaxation massage in SoHo.',
        'long_description': 'Serenity Massage is a tranquil studio offering Swedish, deep-tissue, and prenatal massage by licensed therapists. Heated rooms and aromatherapy included.',
        'location_label': '88 Bleecker St, NYC',
        'services': [
            ('massage', 'Swedish Massage', '60-min full-body relaxation massage.', 11000, 60),
            ('massage', 'Deep Tissue', '60-min targeted deep-tissue work.', 13500, 60),
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
        'name': 'Headlines Hair Salon',
        'short_description': 'Cuts, color, and blowouts uptown.',
        'long_description': 'Headlines Hair Salon offers expert cuts, custom color, balayage, and blowouts in a relaxed uptown space. All stylists have 5+ years of experience.',
        'location_label': '1010 Broadway, NYC',
        'services': [
            ('hair', 'Womens Cut & Style', 'Cut, wash, and blowout.', 8500, 60),
            ('hair', 'Single-Process Color', 'Roots or all-over color refresh.', 14000, 90),
            ('hair', 'Balayage', 'Hand-painted highlights.', 22000, 120),
        ],
    },
]


OLD_PROVIDER_NAMES = [
    'Glow Beauty Studio',
    'Lash Lab NYC',
    'The Nail Bar',
    'Studio Muse Makeup',
]


def _reseed(apps, schema_editor):
    BeautyProvider = apps.get_model('beauty_api', 'BeautyProvider')
    BeautyService = apps.get_model('beauty_api', 'BeautyService')
    BeautyBooking = apps.get_model('beauty_api', 'BeautyBooking')

    # Drop bookings + services + providers from the old taxonomy so we can
    # re-seed cleanly. (Demo data only — no real customer bookings exist
    # against it.)
    BeautyBooking.objects.all().delete()
    BeautyService.objects.all().delete()
    BeautyProvider.objects.filter(name__in=OLD_PROVIDER_NAMES).delete()

    for entry in NEW_PROVIDERS:
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


def _unseed(apps, schema_editor):
    BeautyProvider = apps.get_model('beauty_api', 'BeautyProvider')
    BeautyService = apps.get_model('beauty_api', 'BeautyService')
    BeautyService.objects.all().delete()
    BeautyProvider.objects.filter(name__in=[p['name'] for p in NEW_PROVIDERS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0004_provider_service_booking'),
    ]

    operations = [
        migrations.AlterField(
            model_name='beautyservice',
            name='category',
            field=models.CharField(
                choices=[
                    ('facial', 'Facial'),
                    ('massage', 'Massage'),
                    ('nails', 'Nails'),
                    ('hair', 'Hair'),
                ],
                max_length=32,
            ),
        ),
        migrations.RunPython(_reseed, _unseed),
    ]
