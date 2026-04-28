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
    {
        'icon': '✨',
        'label': 'Facial',
        'slug': 'facial',
        'image': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
    },
    {
        'icon': '💆',
        'label': 'Massage',
        'slug': 'massage',
        'image': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
    },
    {
        'icon': '💅',
        'label': 'Nails',
        'slug': 'nails',
        'image': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
    },
    {
        'icon': '💇',
        'label': 'Hair',
        'slug': 'hair',
        'image': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
    },
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
