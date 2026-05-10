"""Customer reviews of beauty services.

Adds `BeautyReview` so that customers who completed a booking can post
a 1-5 star rating + comment for the service. The owning business may
post one reply per review (editable, not deletable). One review per
(customer, service) pair, enforced by a unique constraint.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0017_beauty_service_search_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='BeautyReview',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating', models.IntegerField()),
                ('body', models.TextField(blank=True, default='')),
                ('business_reply', models.TextField(blank=True, default='')),
                ('business_reply_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('booking', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=models.deletion.SET_NULL,
                    related_name='reviews',
                    to='beauty_api.beautybooking',
                )),
                ('customer', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='reviews',
                    to='beauty_api.beautyuser',
                )),
                ('service', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='reviews',
                    to='beauty_api.beautyservice',
                )),
            ],
            options={
                'db_table': 'beauty_reviews',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['service', '-created_at'], name='beauty_review_svc_idx'),
                ],
                'constraints': [
                    models.UniqueConstraint(
                        fields=['customer', 'service'],
                        name='beauty_review_unique_per_svc',
                    ),
                ],
            },
        ),
    ]
