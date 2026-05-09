from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0013_provider_contact'),
    ]

    operations = [
        migrations.CreateModel(
            name='BeautyAdminPrincipal',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_type', models.CharField(
                    choices=[('customer', 'Customer'), ('business', 'Business Provider')],
                    max_length=20,
                )),
                ('user_id', models.IntegerField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'beauty_admin_principals',
            },
        ),
        migrations.AddConstraint(
            model_name='beautyadminprincipal',
            constraint=models.UniqueConstraint(
                fields=['user_type', 'user_id'],
                name='beauty_admin_principal_unique',
            ),
        ),
    ]
