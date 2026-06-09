"""
Real-time chat WebSocket consumer for the beauty messaging feature.

One socket per booking thread. Both the customer and the owning business
join the same group (`beauty_chat_<booking_id>`); messages, typing
indicators, and read receipts are broadcast to the group so the peer sees
them live (<500ms in-process via the in-memory channel layer).

Persistence still flows through `chat_service`, so a message sent over the
socket is saved exactly like a REST send, and the REST `ChatSendView` also
broadcasts (see chat_views) — either path reaches connected peers live.
"""

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.urls import re_path

from . import chat_service
from .models import BeautyBooking, BeautySession


def group_name(booking_id) -> str:
    return f'beauty_chat_{booking_id}'


def user_group(user_type, user_id) -> str:
    return f'beauty_user_{user_type}_{user_id}'


@database_sync_to_async
def _booking_ctx(booking_id, user_id, user_type):
    """Return chat context for a booking the principal may access, else None."""
    try:
        b = (BeautyBooking.objects
             .select_related('service', 'service__provider', 'customer')
             .get(id=booking_id))
    except BeautyBooking.DoesNotExist:
        return None
    if not chat_service.can_user_access(b, user_id=user_id, user_type=user_type):
        return None
    return {
        'booking_id': b.id,
        'customer_id': b.customer_id,
        'business_id': b.service.provider.business_provider_id,
        'provider_name': b.service.provider.name or 'Business',
        'customer_email': b.customer.email,
        'service_name': b.display_service_name,
    }


@database_sync_to_async
def _persist(booking_id, sender_type, sender_id, body):
    b = BeautyBooking.objects.select_related('service', 'service__provider', 'customer').get(id=booking_id)
    if not chat_service.is_chat_active(b):
        return None
    msg = chat_service.post_message(b, sender_type=sender_type, sender_id=sender_id, body=body)
    return chat_service.serialize_message(msg)


async def _broadcast(channel_layer, ctx, data):
    """Fan a new message out to the booking thread group AND both parties'
    user-level groups (drives the global toast on any screen)."""
    await channel_layer.group_send(group_name(ctx['booking_id']), {'type': 'chat.message', 'message': data})
    base = {
        'booking_id': ctx['booking_id'],
        'sender_type': data['sender_type'],
        'body': data['body'],
        'service_name': ctx['service_name'],
    }
    await channel_layer.group_send(
        user_group('customer', ctx['customer_id']),
        {'type': 'chat.inbox', **base, 'peer_name': ctx['provider_name']},
    )
    if ctx['business_id']:
        await channel_layer.group_send(
            user_group('business', ctx['business_id']),
            {'type': 'chat.inbox', **base, 'peer_name': ctx['customer_email']},
        )


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope.get('beauty_user_id')
        self.user_type = self.scope.get('beauty_user_type')
        self.booking_id = int(self.scope['url_route']['kwargs']['booking_id'])

        valid_type = self.user_type in (BeautySession.USER_TYPE_CUSTOMER, BeautySession.USER_TYPE_BUSINESS)
        if not self.user_id or not valid_type:
            await self.close(code=4401)
            return
        self.ctx = await _booking_ctx(self.booking_id, self.user_id, self.user_type)
        if self.ctx is None:
            await self.close(code=4403)
            return

        self.group = group_name(self.booking_id)
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()
        await self.send_json({'type': 'connected', 'booking_id': self.booking_id, 'viewer_type': self.user_type})

    async def disconnect(self, code):
        if hasattr(self, 'group'):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        kind = content.get('type')
        if kind == 'send':
            body = (content.get('body') or '').strip()
            if not body:
                return
            data = await _persist(self.booking_id, self.user_type, self.user_id, body[:2000])
            if data is None:
                await self.send_json({'type': 'error', 'detail': 'Chat is closed for this booking.'})
                return
            await _broadcast(self.channel_layer, self.ctx, data)
        elif kind == 'typing':
            await self.channel_layer.group_send(
                self.group,
                {'type': 'chat.typing', 'sender_type': self.user_type, 'is_typing': bool(content.get('is_typing'))},
            )
        elif kind == 'read':
            await self.channel_layer.group_send(
                self.group,
                {'type': 'chat.read', 'sender_type': self.user_type, 'at': content.get('at')},
            )

    # ---- group event handlers (channel_layer.group_send type → method) ----
    async def chat_message(self, event):
        await self.send_json({'type': 'message', 'message': event['message']})

    async def chat_typing(self, event):
        if event.get('sender_type') != self.user_type:
            await self.send_json({'type': 'typing', 'sender_type': event['sender_type'], 'is_typing': event['is_typing']})

    async def chat_read(self, event):
        if event.get('sender_type') != self.user_type:
            await self.send_json({'type': 'read', 'sender_type': event['sender_type'], 'at': event.get('at')})


class InboxConsumer(AsyncJsonWebsocketConsumer):
    """One per signed-in user; receives every new message addressed to them
    (across all their bookings) to drive a global, cross-screen toast."""

    async def connect(self):
        self.user_id = self.scope.get('beauty_user_id')
        self.user_type = self.scope.get('beauty_user_type')
        if not self.user_id or self.user_type not in (BeautySession.USER_TYPE_CUSTOMER, BeautySession.USER_TYPE_BUSINESS):
            await self.close(code=4401)
            return
        self.group = user_group(self.user_type, self.user_id)
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group'):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    async def chat_inbox(self, event):
        # Don't toast the sender for their own message.
        if event.get('sender_type') == self.user_type:
            return
        await self.send_json({
            'type': 'inbox',
            'booking_id': event['booking_id'],
            'peer_name': event['peer_name'],
            'service_name': event['service_name'],
            'body': event['body'],
            'viewer_type': self.user_type,
        })


websocket_urlpatterns = [
    re_path(r'^ws/beauty/chat/(?P<booking_id>\d+)/$', ChatConsumer.as_asgi()),
    re_path(r'^ws/beauty/inbox/$', InboxConsumer.as_asgi()),
]
