"""Add BusinessProviderApplication model — gates portal until submitted/accepted."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0008_booking_snapshot_grace_cancel'),
    ]

    operations = [
        migrations.CreateModel(
            name='BusinessProviderApplication',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(
                    choices=[
                        ('draft', 'Draft'),
                        ('submitted', 'Submitted'),
                        ('accepted', 'Accepted'),
                        ('rejected', 'Rejected'),
                    ],
                    default='draft',
                    max_length=16,
                )),
                ('entity_type', models.CharField(
                    blank=True,
                    choices=[('person', 'Person'), ('business', 'Business')],
                    default='',
                    max_length=16,
                )),
                ('itin', models.CharField(blank=True, default='', max_length=9)),
                ('applicant_first_name', models.CharField(blank=True, default='', max_length=128)),
                ('applicant_last_name', models.CharField(blank=True, default='', max_length=128)),
                ('business_name', models.CharField(blank=True, default='', max_length=255)),
                ('address_line1', models.CharField(blank=True, default='', max_length=255)),
                ('address_line2', models.CharField(blank=True, default='', max_length=255)),
                ('city', models.CharField(blank=True, default='', max_length=128)),
                ('state', models.CharField(blank=True, default='', max_length=64)),
                ('postal_code', models.CharField(blank=True, default='', max_length=32)),
                ('selected_categories', models.JSONField(blank=True, default=list)),
                ('third_party_tools', models.JSONField(blank=True, default=list)),
                ('completed_steps', models.JSONField(blank=True, default=list)),
                ('tos_accepted_at', models.DateTimeField(blank=True, null=True)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('accepted_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('business_provider', models.OneToOneField(
                    on_delete=models.deletion.CASCADE,
                    related_name='application',
                    to='beauty_api.businessprovider',
                )),
            ],
            options={
                'db_table': 'beauty_business_applications',
            },
        ),
    ]
