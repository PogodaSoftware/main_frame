"""
Beauty Wireframe Resolver
=========================
Returns the wireframe screen for development/debugging purposes.
"""

from ..services import hateoas_service as h


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    return {
        'action': 'render',
        'screen': 'beauty_wireframe',
        'data': {},
        'meta': {'title': 'Beauty - Wireframe'},
        '_links': {
            'self': h.self_link('beauty_wireframe'),
            'home': h.screen_link('home', 'beauty_home', prompt='Home'),
        },
    }
