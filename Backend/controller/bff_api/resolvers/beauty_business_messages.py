"""Beauty Business Messages Resolver

Desktop business-portal inbox. Reuses the shared ``beauty_chats`` inbox
logic verbatim (same thread list, unread counts, open links) but stamps
the envelope ``screen`` as ``beauty_business_messages`` so the web shell
renders the two-pane provider Messages component. The thread pane fetches
``beauty_chat_thread`` on demand and the live updates ride the existing
Django Channels chat socket.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BusinessProvider

from . import beauty_chats
from ..services.auth_service import get_authenticated_user


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    resp = beauty_chats.resolve(request, screen, device_id, params)
    if isinstance(resp, dict) and resp.get('action') == 'render':
        resp['screen'] = 'beauty_business_messages'
        # Add the business identity for the desktop chrome (sidebar/topbar).
        user = get_authenticated_user(request.COOKIES.get(SESSION_COOKIE_NAME), device_id)
        if user and user.get('user_type') == 'business':
            biz = BusinessProvider.objects.filter(id=user.get('user_id')).first()
            if biz:
                resp.setdefault('data', {})['business'] = {
                    'email': biz.email, 'business_name': biz.business_name,
                }
    return resp
