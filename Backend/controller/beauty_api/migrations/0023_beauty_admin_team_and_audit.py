from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('beauty_api', '0022_beauty_admin_ticket'),
    ]

    operations = [
        # Extend BeautyAdminPrincipal with role + metadata.
        migrations.AddField(
            model_name='BeautyAdminPrincipal',
            name='role',
            field=models.CharField(
                choices=[
                    ('owner', 'Owner'),
                    ('support_lead', 'Support lead'),
                    ('risk_analyst', 'Risk analyst'),
                    ('support_agent', 'Support agent'),
                ],
                default='support_agent', max_length=24,
            ),
        ),
        migrations.AddField(
            model_name='BeautyAdminPrincipal',
            name='display_name',
            field=models.CharField(blank=True, default='', max_length=128),
        ),
        migrations.AddField(
            model_name='BeautyAdminPrincipal',
            name='last_active_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        # Pending admin invites.
        migrations.CreateModel(
            name='BeautyAdminInvite',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254)),
                ('role', models.CharField(
                    choices=[
                        ('owner', 'Owner'),
                        ('support_lead', 'Support lead'),
                        ('risk_analyst', 'Risk analyst'),
                        ('support_agent', 'Support agent'),
                    ],
                    default='support_agent', max_length=24,
                )),
                ('token_hash', models.CharField(max_length=128, unique=True)),
                ('created_by_user_type', models.CharField(blank=True, default='', max_length=16)),
                ('created_by_user_id', models.IntegerField(blank=True, null=True)),
                ('created_by_email', models.EmailField(blank=True, default='', max_length=254)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('consumed_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'db_table': 'beauty_admin_invites',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='BeautyAdminInvite',
            index=models.Index(fields=['email'], name='beauty_adm_inv_email_idx'),
        ),
        # Audit event log.
        migrations.CreateModel(
            name='BeautyAdminAuditEvent',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('actor_user_type', models.CharField(blank=True, default='', max_length=16)),
                ('actor_user_id', models.IntegerField(blank=True, null=True)),
                ('actor_email', models.EmailField(blank=True, default='', max_length=254)),
                ('actor_role', models.CharField(blank=True, default='', max_length=24)),
                ('action', models.CharField(max_length=64)),
                ('target_type', models.CharField(blank=True, default='', max_length=32)),
                ('target_id', models.CharField(blank=True, default='', max_length=64)),
                ('target_label', models.CharField(blank=True, default='', max_length=255)),
                ('meta', models.JSONField(blank=True, default=dict)),
                ('ip', models.GenericIPAddressField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'db_table': 'beauty_admin_audit_events',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='BeautyAdminAuditEvent',
            index=models.Index(fields=['action', '-created_at'], name='beauty_adm_aud_act_idx'),
        ),
        migrations.AddIndex(
            model_name='BeautyAdminAuditEvent',
            index=models.Index(fields=['actor_email'], name='beauty_adm_aud_actor_idx'),
        ),
    ]
