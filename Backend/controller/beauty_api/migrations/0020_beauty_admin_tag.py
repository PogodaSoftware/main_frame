from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('beauty_api', '0019_beauty_favorites'),
    ]

    operations = [
        migrations.CreateModel(
            name='BeautyAdminTag',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.SlugField(max_length=64, unique=True)),
                ('label', models.CharField(max_length=64)),
                ('color', models.CharField(max_length=9)),
                ('tone', models.CharField(max_length=9)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'beauty_admin_tags'},
        ),
    ]
