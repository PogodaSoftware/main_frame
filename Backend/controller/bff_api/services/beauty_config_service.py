"""
Beauty Config Microservice
==========================
Single responsibility: return the static and dynamic configuration
for the Beauty app (service categories, feature flags, etc.).

In a production system these values would be fetched from a database
or a feature-flag service. Keeping this as a dedicated microservice
means the configuration source can change without touching the BFF or
the resolvers.
"""

import os

BEAUTY_SERVICES = [
    {'icon': '💄', 'label': 'Beauty', 'slug': 'beauty'},
    {'icon': '👁️', 'label': 'Lashes', 'slug': 'lashes'},
    {'icon': '💅', 'label': 'Nails', 'slug': 'nails'},
    {'icon': '💋', 'label': 'Makeup', 'slug': 'makeup'},
]


def get_beauty_config() -> dict:
    """
    Returns the Beauty app configuration payload.
    Called on every BFF resolve — never cached on the client.
    """
    google_maps_key = os.environ.get('GOOGLE_MAPS_API_KEY', '')
    return {
        'services': BEAUTY_SERVICES,
        'google_maps_key_present': bool(google_maps_key),
    }
