from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0014_beauty_admin_principal'),
    ]

    operations = [
        migrations.CreateModel(
            name='BeautyAuthAuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(
                    choices=[
                        ('cross_role_signup', 'Cross-role signup blocked'),
                        ('cross_role_login', 'Cross-role login blocked'),
                        ('rate_limited', 'Rate limit triggered'),
                    ],
                    max_length=32,
                )),
                ('masked_email', models.CharField(blank=True, default='', max_length=255)),
                ('request_ip', models.CharField(blank=True, default='', max_length=64)),
                ('attempted_role', models.CharField(blank=True, default='', max_length=20)),
                ('existing_role', models.CharField(blank=True, default='', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'beauty_auth_audit',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['-created_at'], name='beauty_auth_aud_at_idx'),
                    models.Index(fields=['request_ip', '-created_at'], name='beauty_auth_aud_ip_idx'),
                ],
            },
        ),
    ]
