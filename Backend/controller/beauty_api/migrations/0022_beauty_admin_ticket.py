from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('beauty_api', '0021_beauty_admin_note'),
    ]

    operations = [
        migrations.CreateModel(
            name='BeautyAdminTicket',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('priority', models.CharField(
                    choices=[('high', 'High'), ('med', 'Medium'), ('low', 'Low')],
                    default='med', max_length=8,
                )),
                ('category', models.CharField(
                    choices=[
                        ('refund', 'Refund'), ('no-show', 'No-show'), ('payment', 'Payment'),
                        ('payouts', 'Payouts'), ('account', 'Account'), ('fraud', 'Fraud'),
                        ('booking', 'Booking'), ('other', 'Other'),
                    ],
                    default='other', max_length=16,
                )),
                ('status', models.CharField(
                    choices=[
                        ('new', 'New'), ('in_progress', 'In progress'),
                        ('waiting', 'Waiting on user'), ('resolved', 'Resolved'),
                    ],
                    default='new', max_length=16,
                )),
                ('source', models.CharField(
                    choices=[('in_app', 'In-app'), ('email', 'Email'), ('system', 'System')],
                    default='in_app', max_length=12,
                )),
                ('subject', models.CharField(max_length=255)),
                ('body', models.TextField(blank=True, default='')),
                ('from_principal_type', models.CharField(blank=True, default='', max_length=12)),
                ('from_principal_id', models.IntegerField(blank=True, null=True)),
                ('from_label', models.CharField(blank=True, default='', max_length=128)),
                ('sla_breach_at', models.DateTimeField(blank=True, null=True)),
                ('assignee_email', models.EmailField(blank=True, default='', max_length=254)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'beauty_admin_tickets',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='BeautyAdminTicket',
            index=models.Index(fields=['status', '-created_at'], name='beauty_adm_ticket_st_idx'),
        ),
        migrations.AddIndex(
            model_name='BeautyAdminTicket',
            index=models.Index(fields=['category'], name='beauty_adm_ticket_cat_idx'),
        ),
    ]
