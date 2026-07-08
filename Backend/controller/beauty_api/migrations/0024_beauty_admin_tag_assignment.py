from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0023_beauty_admin_team_and_audit'),
    ]

    operations = [
        migrations.CreateModel(
            name='BeautyAdminTagAssignment',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_type', models.CharField(choices=[('customer', 'Customer'), ('business', 'Business Provider')], max_length=20)),
                ('user_id', models.IntegerField()),
                ('assigned_by_email', models.EmailField(blank=True, default='', max_length=254)),
                ('assigned_at', models.DateTimeField(auto_now_add=True)),
                ('tag', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='assignments', to='beauty_api.beautyadmintag')),
            ],
            options={
                'db_table': 'beauty_admin_tag_assignments',
            },
        ),
        migrations.AddIndex(
            model_name='beautyadmintagassignment',
            index=models.Index(fields=['user_type', 'user_id'], name='beauty_tag_assn_target_idx'),
        ),
        migrations.AddConstraint(
            model_name='beautyadmintagassignment',
            constraint=models.UniqueConstraint(fields=('tag', 'user_type', 'user_id'), name='beauty_admin_tag_assignment_unique'),
        ),
    ]
