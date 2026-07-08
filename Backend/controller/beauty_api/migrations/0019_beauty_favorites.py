"""Customer-favorited services.

Adds `BeautyFavorite` so customers can save a service for later. One
row per (customer, service) pair (UniqueConstraint). Cascade-deletes
with the customer or the service.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0018_beauty_reviews'),
    ]

    operations = [
        migrations.CreateModel(
            name='BeautyFavorite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='favorites',
                    to='beauty_api.beautyuser',
                )),
                ('service', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='favorited_by',
                    to='beauty_api.beautyservice',
                )),
            ],
            options={
                'db_table': 'beauty_favorites',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['customer', '-created_at'], name='beauty_fav_cust_at_idx'),
                ],
                'constraints': [
                    models.UniqueConstraint(
                        fields=['customer', 'service'],
                        name='beauty_favorite_unique',
                    ),
                ],
            },
        ),
    ]
