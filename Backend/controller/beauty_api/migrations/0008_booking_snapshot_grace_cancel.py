"""
Add cancellation states, grace-period cancel, and service-snapshot
columns to BeautyBooking.

- Widens `status` to 32 chars and introduces `cancelled_by_customer`,
  `cancelled_by_business`, `cancelled_immediate` choices alongside the
  legacy `cancelled` value (kept so historical rows still render).
- Adds `grace_period_ends_at` (nullable) — controls the `cancel_grace`
  HATEOAS link.
- Adds the service-snapshot columns and backfills them from the
  current FK values for existing rows so past bookings keep their
  price/duration/name even if the live service is later edited.
"""

from django.db import migrations, models


def backfill_service_snapshots(apps, schema_editor):
    BeautyBooking = apps.get_model('beauty_api', 'BeautyBooking')
    for b in BeautyBooking.objects.select_related('service').all().iterator():
        svc = b.service
        # Only backfill rows that don't yet have a snapshot.
        changed = False
        if not b.service_name_at_booking:
            b.service_name_at_booking = svc.name or ''
            changed = True
        if b.service_price_cents_at_booking is None:
            b.service_price_cents_at_booking = svc.price_cents
            changed = True
        if b.service_duration_minutes_at_booking is None:
            b.service_duration_minutes_at_booking = svc.duration_minutes
            changed = True
        if changed:
            b.save(update_fields=[
                'service_name_at_booking',
                'service_price_cents_at_booking',
                'service_duration_minutes_at_booking',
            ])


def noop_reverse(apps, schema_editor):
    # Snapshot columns will be dropped by the schema-reverse step; nothing
    # to undo on the data side.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0007_beautyprovideravailability_is_24h'),
    ]

    operations = [
        migrations.AlterField(
            model_name='beautybooking',
            name='status',
            field=models.CharField(
                max_length=32,
                default='booked',
                choices=[
                    ('booked', 'Booked'),
                    ('cancelled', 'Cancelled (legacy)'),
                    ('cancelled_by_customer', 'Cancelled by customer'),
                    ('cancelled_by_business', 'Cancelled by business'),
                    ('cancelled_immediate', 'Cancelled within grace period'),
                    ('completed', 'Completed'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='beautybooking',
            name='service_name_at_booking',
            field=models.CharField(max_length=255, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='beautybooking',
            name='service_price_cents_at_booking',
            field=models.IntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='beautybooking',
            name='service_duration_minutes_at_booking',
            field=models.IntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='beautybooking',
            name='grace_period_ends_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.RunPython(backfill_service_snapshots, noop_reverse),
    ]
