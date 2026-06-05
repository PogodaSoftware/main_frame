"""
ASGI config for main_frame_project.

Exposes a ProtocolTypeRouter so the same process serves both the existing
HTTP/REST app (via the Django ASGI app) and the new WebSocket chat used by
the real-time beauty messaging feature.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'main_frame_project.settings')

# Initialise Django (apps, settings) before importing anything that touches
# models — Channels routing/consumers import model code.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from beauty_api.chat_consumer import websocket_urlpatterns  # noqa: E402
from beauty_api.ws_auth import CookieAuthMiddleware  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': CookieAuthMiddleware(URLRouter(websocket_urlpatterns)),
})
