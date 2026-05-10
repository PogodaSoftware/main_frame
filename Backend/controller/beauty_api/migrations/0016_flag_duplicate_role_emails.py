"""
Data migration — V12 from the role-separation handoff.

Finds any email present in BOTH the customer (``beauty_users``) and
business (``beauty_business_providers``) tables and writes one
``cross_role_signup`` row to the audit log per collision so an
operator can review and merge or reject manually.

This migration intentionally does NOT auto-delete or auto-merge any
account. Picking which side to keep is a human decision (booking
history vs business storefront vs service catalog), so we surface the
collision and stop. Future code paths added by 0015 prevent any new
duplicates from being created.
"""

from django.db import migrations


def flag_duplicates(apps, schema_editor):
    BeautyUser = apps.get_model('beauty_api', 'BeautyUser')
    BusinessProvider = apps.get_model('beauty_api', 'BusinessProvider')
    Audit = apps.get_model('beauty_api', 'BeautyAuthAuditLog')

    customer_emails = set(
        BeautyUser.objects.values_list('email', flat=True)
    )
    if not customer_emails:
        return

    overlap = BusinessProvider.objects.filter(email__in=customer_emails)
    for provider in overlap.iterator():
        email = provider.email or ''
        local, _, domain = email.partition('@')
        masked = f'{local[0]}***@{domain}' if local and domain else ''
        Audit.objects.create(
            event_type='cross_role_signup',
            masked_email=masked,
            request_ip='migration',
            attempted_role='business',
            existing_role='customer',
        )


def noop_reverse(apps, schema_editor):
    # The audit log is append-only; reverse migration leaves the rows
    # in place rather than guessing which migration-added entries are
    # safe to remove.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0015_beauty_auth_audit'),
    ]

    operations = [
        migrations.RunPython(flag_duplicates, noop_reverse),
    ]
