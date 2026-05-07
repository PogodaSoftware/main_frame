from decimal import Decimal

from django.db import migrations, models


def backfill_price_dollars(apps, schema_editor):
    BeautyService = apps.get_model('beauty_api', 'BeautyService')
    BeautyBooking = apps.get_model('beauty_api', 'BeautyBooking')

    for svc in BeautyService.objects.all().iterator():
        svc.price_dollars = (Decimal(svc.price_cents) / Decimal(100)).quantize(Decimal('0.01'))
        svc.save(update_fields=['price_dollars'])

    for bk in BeautyBooking.objects.exclude(service_price_cents_at_booking__isnull=True).iterator():
        bk.service_price_dollars_at_booking = (
            Decimal(bk.service_price_cents_at_booking) / Decimal(100)
        ).quantize(Decimal('0.01'))
        bk.save(update_fields=['service_price_dollars_at_booking'])


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0011_beauty_chat_messages'),
    ]

    operations = [
        migrations.AddField(
            model_name='beautyservice',
            name='price_dollars',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='beautybooking',
            name='service_price_dollars_at_booking',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.RunPython(backfill_price_dollars, reverse_noop),
    ]
