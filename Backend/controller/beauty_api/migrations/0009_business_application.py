from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0008_booking_snapshot_grace_cancel'),
    ]

    operations = [
        migrations.AddField(
            model_name='businessprovider',
            name='first_name',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='businessprovider',
            name='last_name',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='businessprovider',
            name='application_completed',
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name='BusinessApplication',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('applicant_kind', models.CharField(
                    choices=[
                        ('person', 'Individual / Sole Proprietor'),
                        ('business', 'Registered Business'),
                    ],
                    default='person', max_length=16)),
                ('itin', models.CharField(blank=True, default='', max_length=32)),
                ('legal_business_name', models.CharField(blank=True, default='', max_length=255)),
                ('address_line1', models.CharField(blank=True, default='', max_length=255)),
                ('address_line2', models.CharField(blank=True, default='', max_length=255)),
                ('address_city', models.CharField(blank=True, default='', max_length=120)),
                ('address_state', models.CharField(blank=True, default='', max_length=64)),
                ('address_postal_code', models.CharField(blank=True, default='', max_length=32)),
                ('services_offered', models.JSONField(blank=True, default=list)),
                ('stripe_connected', models.BooleanField(default=False)),
                ('stripe_placeholder_account', models.CharField(blank=True, default='', max_length=64)),
                ('schedule_template', models.JSONField(blank=True, default=list)),
                ('third_party_tools', models.JSONField(blank=True, default=list)),
                ('tos_accepted', models.BooleanField(default=False)),
                ('tos_accepted_at', models.DateTimeField(blank=True, null=True)),
                ('status', models.CharField(
                    choices=[
                        ('draft', 'Draft'),
                        ('submitted', 'Submitted'),
                        ('approved', 'Approved'),
                    ],
                    default='draft', max_length=16)),
                ('current_step', models.IntegerField(default=1)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('business', models.OneToOneField(
                    on_delete=models.deletion.CASCADE,
                    related_name='application',
                    to='beauty_api.businessprovider')),
            ],
            options={
                'db_table': 'beauty_business_applications',
            },
        ),
    ]
