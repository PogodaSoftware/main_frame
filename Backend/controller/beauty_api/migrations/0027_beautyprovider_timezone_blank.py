from django.db import migrations, models


def reset_default_utc(apps, schema_editor):
    """Rows created with the prior default='UTC' weren't explicit choices —
    blank them so resolve_timezone() can derive from location_label instead."""
    BeautyProvider = apps.get_model('beauty_api', 'BeautyProvider')
    BeautyProvider.objects.filter(timezone='UTC').update(timezone='')


class Migration(migrations.Migration):

    dependencies = [
        ('beauty_api', '0026_beautyprovider_timezone'),
    ]

    operations = [
        migrations.AlterField(
            model_name='beautyprovider',
            name='timezone',
            field=models.CharField(blank=True, default='', max_length=64),
        ),
        migrations.RunPython(reset_default_utc, migrations.RunPython.noop),
    ]
