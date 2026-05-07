"""
Beauty Chat Service
===================
Per-booking 1:1 chat between a customer and the booking's business
provider. The chat exists for the lifetime of the booking and is
auto-deleted 24 hours after the service ends.

Eligibility rules
-----------------
- The booking must exist and be owned by the authenticated principal
  (the customer who booked it, OR the business provider whose service
  was booked).
- The booking must be in a non-cancelled, non-grace-cancelled state.
  ``booked`` and ``completed`` rows allow chat; cancellations close it.
- A booking that is "expired" — meaning ``now > slot_at + duration + 24h``
  — disallows further messages and any existing messages are pruned.

Cleanup is lazy: every read or send call invokes
``prune_expired_for(booking)`` so old threads disappear without a
scheduled task. ``prune_all_expired()`` is provided for admin/cron use.
"""

from datetime import datetime, timedelta, timezone

from .models import BeautyBooking, BeautyChatMessage


CHAT_RETENTION_HOURS = 24


def _service_end(booking: BeautyBooking) -> datetime:
    """When the booked service is considered finished."""
    duration = booking.display_duration_minutes or 0
    return booking.slot_at + timedelta(minutes=duration)


def chat_expires_at(booking: BeautyBooking) -> datetime:
    """Moment past which chat is deleted."""
    return _service_end(booking) + timedelta(hours=CHAT_RETENTION_HOURS)


def is_chat_active(booking: BeautyBooking, *, now: datetime | None = None) -> bool:
    """Is the chat still open for new messages?"""
    if booking.status in BeautyBooking.CANCELLED_STATUSES:
        return False
    n = now or datetime.now(timezone.utc)
    return n < chat_expires_at(booking)


def prune_expired_for(booking: BeautyBooking, *, now: datetime | None = None) -> int:
    """Delete this booking's messages if past the 24h post-service window."""
    n = now or datetime.now(timezone.utc)
    if n >= chat_expires_at(booking):
        deleted, _ = BeautyChatMessage.objects.filter(booking_id=booking.id).delete()
        return int(deleted or 0)
    return 0


def prune_all_expired(*, now: datetime | None = None) -> int:
    """Sweep every booking's messages for the 24h-post-service rule.

    Intended for a periodic management command / cron. Runs in a single
    DELETE that joins through the booking's slot/duration so we don't
    iterate every chat row in Python.
    """
    n = now or datetime.now(timezone.utc)
    deleted = 0
    qs = BeautyChatMessage.objects.select_related('booking', 'booking__service').only(
        'id', 'booking_id', 'booking__slot_at',
        'booking__service_duration_minutes_at_booking',
        'booking__service__duration_minutes',
    )
    expired_ids: list[int] = []
    for msg in qs.iterator():
        if n >= chat_expires_at(msg.booking):
            expired_ids.append(msg.id)
    if expired_ids:
        d, _ = BeautyChatMessage.objects.filter(id__in=expired_ids).delete()
        deleted = int(d or 0)
    return deleted


def can_user_access(booking: BeautyBooking, *, user_id: int, user_type: str) -> bool:
    """Owner-or-provider authorization gate."""
    if user_type == 'customer':
        return booking.customer_id == user_id
    if user_type == 'business':
        # The booking is for one service; that service belongs to a provider;
        # that provider is owned by a BusinessProvider id we compare to user_id.
        provider = booking.service.provider
        return provider.business_provider_id == user_id
    return False


def serialize_message(msg: BeautyChatMessage) -> dict:
    return {
        'id': msg.id,
        'booking_id': msg.booking_id,
        'sender_type': msg.sender_type,
        'sender_id': msg.sender_id,
        'body': msg.body,
        'created_at': msg.created_at.isoformat(),
    }


def list_messages(booking: BeautyBooking) -> list[dict]:
    prune_expired_for(booking)
    qs = BeautyChatMessage.objects.filter(booking_id=booking.id).order_by('created_at', 'id')
    return [serialize_message(m) for m in qs]


def post_message(
    booking: BeautyBooking,
    *,
    sender_type: str,
    sender_id: int,
    body: str,
) -> BeautyChatMessage:
    """Persist a new message. Caller must validate access + active state."""
    msg = BeautyChatMessage.objects.create(
        booking=booking,
        sender_type=sender_type,
        sender_id=sender_id,
        body=body,
    )
    return msg
