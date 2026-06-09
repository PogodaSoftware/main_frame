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

# Customer-web "Browse by category" tiles. `count` is the displayed studio
# count per category (marketing figure mirrored from the design handoff).
BEAUTY_SERVICES = [
    {
        'icon': '✨',
        'label': 'Facial',
        'slug': 'facial',
        'count': 124,
        'image': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
    },
    {
        'icon': '💆',
        'label': 'Massage',
        'slug': 'massage',
        'count': 88,
        'image': 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
    },
    {
        'icon': '💅',
        'label': 'Nails',
        'slug': 'nails',
        'count': 142,
        'image': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
    },
    {
        'icon': '💇',
        'label': 'Hair',
        'slug': 'hair',
        'count': 184,
        'image': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
    },
    {
        'icon': '🪮',
        'label': 'Brows',
        'slug': 'brows',
        'count': 96,
        'image': 'https://images.unsplash.com/photo-1564278692313-b2d65996fc93?auto=format&fit=crop&w=800&q=80',
    },
    {
        'icon': '👁️',
        'label': 'Lashes',
        'slug': 'lashes',
        'count': 68,
        'image': 'https://images.unsplash.com/photo-1735151226446-1d364b4adc2f?auto=format&fit=crop&w=800&q=80',
    },
    {
        'icon': '🕯️',
        'label': 'Wax',
        'slug': 'wax',
        'count': 42,
        'image': 'https://plus.unsplash.com/premium_photo-1661431392914-e3fc8ff0e51a?auto=format&fit=crop&w=800&q=80',
    },
    {
        'icon': '💄',
        'label': 'Makeup',
        'slug': 'makeup',
        'count': 36,
        'image': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80',
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
