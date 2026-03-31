from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='BusinessProvider',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('password', models.CharField(max_length=255)),
                ('business_name', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'beauty_business_providers',
            },
        ),
        migrations.CreateModel(
            name='BeautySession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id', models.IntegerField()),
                ('user_type', models.CharField(
                    choices=[('customer', 'Customer'), ('business', 'Business Provider')],
                    max_length=20,
                )),
                ('device_id', models.CharField(max_length=255)),
                ('token_hash', models.CharField(max_length=255, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'db_table': 'beauty_sessions',
            },
        ),
        migrations.AddIndex(
            model_name='beautysession',
            index=models.Index(fields=['token_hash'], name='beauty_sess_token_h_idx'),
        ),
        migrations.AddIndex(
            model_name='beautysession',
            index=models.Index(fields=['user_id', 'user_type', 'device_id'], name='beauty_sess_user_dev_idx'),
        ),
    ]
