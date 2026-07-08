from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('beauty_api', '0020_beauty_admin_tag'),
    ]

    operations = [
        migrations.CreateModel(
            name='BeautyAdminNote',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('target_type', models.CharField(
                    choices=[('customer', 'Customer'), ('business', 'Business Provider')], max_length=16,
                )),
                ('target_id', models.IntegerField()),
                ('author_email', models.EmailField(blank=True, default='', max_length=254)),
                ('author_user_type', models.CharField(blank=True, default='', max_length=16)),
                ('author_user_id', models.IntegerField(blank=True, null=True)),
                ('body', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'beauty_admin_notes',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='BeautyAdminNote',
            index=models.Index(
                fields=['target_type', 'target_id', '-created_at'],
                name='beauty_adm_note_tgt_idx',
            ),
        ),
        migrations.AlterField(
            model_name='BeautyChatMessage',
            name='sender_type',
            field=models.CharField(
                choices=[
                    ('customer', 'Customer'),
                    ('business', 'Business Provider'),
                    ('admin', 'Admin'),
                ],
                max_length=16,
            ),
        ),
    ]
