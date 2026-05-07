"""Per-booking chat between customer and business provider.

Each row is a single message. The thread is implicit (all messages
sharing a `booking_id`). Messages are pruned 24h after the booking's
service ends — the cleanup runs lazily on read (see
``chat_service.prune_expired_for``) and via a global sweep helper.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0010_account_suspension'),
    ]

    operations = [
        migrations.CreateModel(
            name='BeautyChatMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sender_type', models.CharField(max_length=16, choices=[
                    ('customer', 'Customer'),
                    ('business', 'Business Provider'),
                ])),
                ('sender_id', models.IntegerField()),
                ('body', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('booking', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='chat_messages',
                    to='beauty_api.beautybooking',
                )),
            ],
            options={
                'db_table': 'beauty_chat_messages',
                'ordering': ['created_at', 'id'],
                'indexes': [
                    models.Index(fields=['booking', 'created_at'], name='beauty_chat_bk_at_idx'),
                ],
            },
        ),
    ]
