"""Per-viewer read markers for booking chat threads.

One row per (booking, viewer) records when that viewer last opened the
thread. Drives the unread-message count / Messages-tab badge. Rows
cascade-delete with the booking, same as the chat messages.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0024_beauty_admin_tag_assignment'),
    ]

    operations = [
        migrations.CreateModel(
            name='BeautyChatRead',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('viewer_type', models.CharField(max_length=16, choices=[
                    ('customer', 'Customer'),
                    ('business', 'Business Provider'),
                    ('admin', 'Admin'),
                ])),
                ('viewer_id', models.IntegerField()),
                ('last_read_at', models.DateTimeField()),
                ('booking', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='chat_reads',
                    to='beauty_api.beautybooking',
                )),
            ],
            options={
                'db_table': 'beauty_chat_reads',
            },
        ),
        migrations.AddConstraint(
            model_name='beautychatread',
            constraint=models.UniqueConstraint(
                fields=['booking', 'viewer_type', 'viewer_id'],
                name='beauty_chat_read_unique',
            ),
        ),
        migrations.AddIndex(
            model_name='beautychatread',
            index=models.Index(fields=['viewer_type', 'viewer_id'], name='beauty_chat_read_viewer_idx'),
        ),
    ]
