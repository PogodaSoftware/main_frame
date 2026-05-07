"""
Beauty Chat REST API
====================
Per-booking 1:1 chat between the booking's customer and the business
provider that owns the service.

Endpoints
---------
- GET  /api/beauty/protected/bookings/<booking_id>/chat/        — list messages
- POST /api/beauty/protected/bookings/<booking_id>/chat/send/   — append message
- GET  /api/beauty/protected/chats/                             — list user's chats
- GET  /api/beauty/protected/business/chats/                    — list business's chats

Both lists return one entry per ELIGIBLE booking (i.e. the chat has
been "unlocked" by a successful booking and still falls inside the
24h-post-service retention window).

Auth: customer sessions for the customer routes, business sessions for
the business route. Authorization: each endpoint also checks the
caller actually owns the booking.
"""

from datetime import datetime, timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import chat_service
from .models import BeautyBooking, BeautyChatMessage, BeautyProvider, BeautySession


def _principal(request) -> tuple[int | None, str | None]:
    user_id = getattr(request, 'beauty_user_id', None)
    user_type = getattr(request, 'beauty_user_type', None)
    return user_id, user_type


def _load_booking_for_principal(booking_id: int, user_id: int, user_type: str) -> BeautyBooking | None:
    try:
        booking = (
            BeautyBooking.objects.select_related('service', 'service__provider', 'customer')
            .get(id=booking_id)
        )
    except BeautyBooking.DoesNotExist:
        return None
    if not chat_service.can_user_access(booking, user_id=user_id, user_type=user_type):
        return None
    return booking


def _peer_label(booking: BeautyBooking, viewer_type: str) -> str:
    """The display name shown to the viewer for the other side of the chat."""
    if viewer_type == 'customer':
        return booking.service.provider.name or 'Business'
    # business viewer → customer email is the only stable identifier we have
    return booking.customer.email


class ChatThreadView(APIView):
    """GET messages for a single booking's chat."""

    def get(self, request, booking_id):
        user_id, user_type = _principal(request)
        if not user_id or user_type not in (BeautySession.USER_TYPE_CUSTOMER, BeautySession.USER_TYPE_BUSINESS):
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        booking = _load_booking_for_principal(booking_id, user_id, user_type)
        if booking is None:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        messages = chat_service.list_messages(booking)
        active = chat_service.is_chat_active(booking)
        return Response(
            {
                'booking_id': booking.id,
                'is_active': active,
                'expires_at': chat_service.chat_expires_at(booking).isoformat(),
                'peer_name': _peer_label(booking, user_type),
                'service_name': booking.display_service_name,
                'slot_at': booking.slot_at.isoformat(),
                'messages': messages,
                'viewer_type': user_type,
            },
            status=status.HTTP_200_OK,
        )


class ChatSendView(APIView):
    """POST a new message into a booking's chat."""

    MAX_BODY_LEN = 2000

    def post(self, request, booking_id):
        user_id, user_type = _principal(request)
        if not user_id or user_type not in (BeautySession.USER_TYPE_CUSTOMER, BeautySession.USER_TYPE_BUSINESS):
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        booking = _load_booking_for_principal(booking_id, user_id, user_type)
        if booking is None:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Lazy prune so an expired chat isn't extended by a new message.
        chat_service.prune_expired_for(booking)
        if not chat_service.is_chat_active(booking):
            return Response(
                {'detail': 'Chat is closed for this booking.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        body = (request.data.get('body') or '').strip()
        if not body:
            return Response(
                {'detail': 'Message body is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(body) > self.MAX_BODY_LEN:
            return Response(
                {'detail': f'Message body too long (max {self.MAX_BODY_LEN}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        msg = chat_service.post_message(
            booking,
            sender_type=user_type,
            sender_id=user_id,
            body=body,
        )
        return Response(chat_service.serialize_message(msg), status=status.HTTP_201_CREATED)


def _list_threads_for_principal(user_id: int, user_type: str) -> list[dict]:
    """Return one entry per chat-eligible booking the principal owns."""
    now = datetime.now(timezone.utc)
    if user_type == BeautySession.USER_TYPE_CUSTOMER:
        qs = (
            BeautyBooking.objects.select_related('service', 'service__provider')
            .filter(customer_id=user_id)
        )
    else:
        provider_ids = list(
            BeautyProvider.objects.filter(business_provider_id=user_id).values_list('id', flat=True)
        )
        qs = (
            BeautyBooking.objects.select_related('service', 'service__provider', 'customer')
            .filter(service__provider_id__in=provider_ids)
        )

    threads: list[dict] = []
    for b in qs:
        if b.status in BeautyBooking.CANCELLED_STATUSES:
            continue
        if now >= chat_service.chat_expires_at(b):
            # Sweep this booking's messages opportunistically and skip it.
            chat_service.prune_expired_for(b, now=now)
            continue
        # Last message preview (one query per booking — small N).
        last = (
            BeautyChatMessage.objects.filter(booking_id=b.id)
            .order_by('-created_at', '-id').first()
        )
        peer = b.service.provider.name or 'Business' if user_type == 'customer' else b.customer.email
        threads.append({
            'booking_id': b.id,
            'service_name': b.display_service_name,
            'slot_at': b.slot_at.isoformat(),
            'status': b.status,
            'peer_name': peer,
            'last_message': last.body if last else '',
            'last_at': last.created_at.isoformat() if last else None,
            'is_active': chat_service.is_chat_active(b, now=now),
            'expires_at': chat_service.chat_expires_at(b).isoformat(),
        })
    threads.sort(key=lambda x: x['last_at'] or x['slot_at'], reverse=True)
    return threads


class CustomerChatListView(APIView):
    """GET /api/beauty/protected/chats/ — current customer's open chats."""

    def get(self, request):
        user_id, user_type = _principal(request)
        if user_type != BeautySession.USER_TYPE_CUSTOMER or not user_id:
            return Response({'detail': 'Customers only.'}, status=status.HTTP_403_FORBIDDEN)
        return Response({'threads': _list_threads_for_principal(user_id, user_type)}, status=status.HTTP_200_OK)


class BusinessChatListView(APIView):
    """GET /api/beauty/protected/business/chats/ — current business's open chats."""

    def get(self, request):
        user_id, user_type = _principal(request)
        if user_type != BeautySession.USER_TYPE_BUSINESS or not user_id:
            return Response({'detail': 'Business only.'}, status=status.HTTP_403_FORBIDDEN)
        return Response({'threads': _list_threads_for_principal(user_id, user_type)}, status=status.HTTP_200_OK)
