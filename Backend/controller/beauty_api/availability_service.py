"""
Availability Service
====================
Combines a provider's weekly business hours with their existing bookings
to project bookable slots into the future. Replaces the fixed
3-slots-per-day generator that lived in the BFF before Task #14/#15.

Public functions
----------------
- get_weekly_hours(provider) -> list[dict]
    Always returns 7 rows (Mon..Sun) — auto-creating any missing rows
    with sensible defaults so the editor UI never has to handle partial
    data.

- replace_weekly_hours(provider, rows)
    Bulk-replace all 7 rows for a provider from validated form input.

- compute_slots(service, days_ahead=14, slot_step_minutes=30)
    Generate ISO timestamps for upcoming bookable slots. Skips closed
    days, skips slots that overlap any existing booking on the same
    provider, and only returns slots strictly in the future.

- is_slot_available(service, slot_at)
    Server-side validation used at booking-create time so the booking
    POST cannot bypass business hours / overlap rules.
"""

from datetime import datetime, date, time, timedelta, timezone

from .models import (
    BeautyBooking,
    BeautyProvider,
    BeautyProviderAvailability,
    BeautyService,
)


DEFAULT_OPEN = time(10, 0)
DEFAULT_CLOSE = time(18, 0)
DEFAULT_SLOT_STEP_MINUTES = 30
DOW_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


def _row_to_dict(row: BeautyProviderAvailability) -> dict:
    return {
        'day_of_week': row.day_of_week,
        'day_label': DOW_LABELS[row.day_of_week],
        'start_time': row.start_time.strftime('%H:%M'),
        'end_time': row.end_time.strftime('%H:%M'),
        'is_closed': row.is_closed,
        'is_24h': row.is_24h,
    }


def get_weekly_hours(provider: BeautyProvider) -> list[dict]:
    """Return 7 rows ordered Mon..Sun, creating defaults for any missing days."""
    existing = {row.day_of_week: row for row in provider.availability.all()}
    out = []
    for dow in range(7):
        row = existing.get(dow)
        if row is None:
            # Sunday closed by default, otherwise 10-18.
            closed = dow == 6
            row = BeautyProviderAvailability.objects.create(
                provider=provider,
                day_of_week=dow,
                start_time=time(0, 0) if closed else DEFAULT_OPEN,
                end_time=time(0, 0) if closed else DEFAULT_CLOSE,
                is_closed=closed,
                is_24h=False,
            )
        out.append(_row_to_dict(row))
    return out


def _parse_time(value: str) -> time | None:
    if not value:
        return None
    try:
        h, m = value.split(':', 1)
        return time(int(h), int(m))
    except (ValueError, TypeError):
        return None


def replace_weekly_hours(provider: BeautyProvider, rows: list[dict]) -> list[str]:
    """
    Validate and replace all 7 weekly-hour rows for a provider.

    Returns a list of human-readable validation errors. Empty list = OK.
    Does not mutate the database when validation fails.
    """
    errors: list[str] = []
    by_dow: dict[int, dict] = {}
    for raw in rows or []:
        if not isinstance(raw, dict):
            continue
        try:
            dow = int(raw.get('day_of_week'))
        except (TypeError, ValueError):
            continue
        if dow < 0 or dow > 6:
            continue
        is_closed = bool(raw.get('is_closed'))
        is_24h = bool(raw.get('is_24h'))
        start = _parse_time(raw.get('start_time'))
        end = _parse_time(raw.get('end_time'))
        if not is_closed and not is_24h:
            if start is None or end is None:
                errors.append(f'{DOW_LABELS[dow]}: invalid times.')
                continue
            if end <= start:
                errors.append(f'{DOW_LABELS[dow]}: end time must be after start time.')
                continue
        by_dow[dow] = {
            'is_closed': is_closed,
            'is_24h': is_24h and not is_closed,
            'start_time': start or time(0, 0),
            'end_time': end or time(0, 0),
        }

    if errors:
        return errors

    for dow in range(7):
        defaults = by_dow.get(dow) or {
            'is_closed': dow == 6,
            'is_24h': False,
            'start_time': DEFAULT_OPEN,
            'end_time': DEFAULT_CLOSE,
        }
        BeautyProviderAvailability.objects.update_or_create(
            provider=provider,
            day_of_week=dow,
            defaults=defaults,
        )
    return []


def _provider_busy_intervals(
    provider_id: int,
    day_start: datetime,
    day_end: datetime,
    *,
    exclude_booking_id: int | None = None,
) -> list[tuple[datetime, datetime]]:
    """All (start, end) intervals already booked on this provider within [day_start, day_end).

    `exclude_booking_id` lets the reschedule flow skip its own current slot
    so a booking doesn't block its own move into a different time.
    """
    qs = (
        BeautyBooking.objects.select_related('service')
        .filter(
            service__provider_id=provider_id,
            status=BeautyBooking.STATUS_BOOKED,
            slot_at__gte=day_start - timedelta(hours=6),
            slot_at__lt=day_end + timedelta(hours=6),
        )
    )
    if exclude_booking_id is not None:
        qs = qs.exclude(id=exclude_booking_id)
    return [
        (b.slot_at, b.slot_at + timedelta(minutes=b.service.duration_minutes))
        for b in qs
    ]


def _overlaps(start: datetime, end: datetime, busy: list[tuple[datetime, datetime]]) -> bool:
    for bstart, bend in busy:
        if start < bend and bstart < end:
            return True
    return False


def compute_slots(
    service: BeautyService,
    *,
    days_ahead: int = 14,
    slot_step_minutes: int = DEFAULT_SLOT_STEP_MINUTES,
    exclude_booking_id: int | None = None,
) -> list[dict]:
    """
    Build an ordered list of bookable slots for a service over the next
    `days_ahead` days. Each entry is { 'value': iso, 'label': human }.
    """
    provider = service.provider
    duration = max(int(service.duration_minutes or 60), 15)
    step = max(int(slot_step_minutes or DEFAULT_SLOT_STEP_MINUTES), 5)

    weekly = {row.day_of_week: row for row in provider.availability.all()}
    now = datetime.now(timezone.utc)

    # We compute slots in UTC for parity with the rest of the codebase.
    today: date = now.date()
    end_date: date = today + timedelta(days=days_ahead)
    busy = _provider_busy_intervals(
        provider.id,
        datetime.combine(today, time.min, tzinfo=timezone.utc),
        datetime.combine(end_date, time.min, tzinfo=timezone.utc),
        exclude_booking_id=exclude_booking_id,
    )

    results: list[dict] = []
    cursor = today
    while cursor < end_date:
        dow = cursor.weekday()
        row = weekly.get(dow)
        if row is None or row.is_closed:
            cursor += timedelta(days=1)
            continue
        if row.is_24h:
            # Open the full UTC day. Using the next day's midnight as the
            # close boundary lets a service consume the last minutes too.
            open_at = datetime.combine(cursor, time(0, 0), tzinfo=timezone.utc)
            close_at = datetime.combine(cursor + timedelta(days=1), time(0, 0), tzinfo=timezone.utc)
        else:
            open_at = datetime.combine(cursor, row.start_time, tzinfo=timezone.utc)
            close_at = datetime.combine(cursor, row.end_time, tzinfo=timezone.utc)
        slot = open_at
        while slot + timedelta(minutes=duration) <= close_at:
            if slot > now and not _overlaps(slot, slot + timedelta(minutes=duration), busy):
                # Label is intentionally a UTC fallback only — the
                # client renders the canonical `value` (ISO with TZ
                # offset) in the customer's local timezone so an
                # out-of-town customer sees their own clock.
                results.append({
                    'value': slot.isoformat(),
                    'label': slot.strftime('%a %b %-d · %-I:%M %p UTC'),
                })
            slot += timedelta(minutes=step)
        cursor += timedelta(days=1)
    return results


def is_slot_available(
    service: BeautyService,
    slot_at: datetime,
    *,
    exclude_booking_id: int | None = None,
) -> tuple[bool, str | None]:
    """Server-side check used by the booking POST + reschedule. Returns (ok, error_msg).

    `exclude_booking_id` lets the reschedule flow ignore its own current
    slot when checking for conflicts.
    """
    if slot_at.tzinfo is None:
        slot_at = slot_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    if slot_at <= now:
        return False, 'Slot must be in the future.'

    provider = service.provider
    duration = max(int(service.duration_minutes or 60), 15)
    end_at = slot_at + timedelta(minutes=duration)

    weekly = {row.day_of_week: row for row in provider.availability.all()}
    row = weekly.get(slot_at.weekday())
    if row is None or row.is_closed:
        return False, 'The provider is closed on that day.'

    if not row.is_24h:
        open_at = datetime.combine(slot_at.date(), row.start_time, tzinfo=timezone.utc)
        close_at = datetime.combine(slot_at.date(), row.end_time, tzinfo=timezone.utc)
        if slot_at < open_at or end_at > close_at:
            return False, 'Slot is outside business hours.'

    busy = _provider_busy_intervals(
        provider.id,
        datetime.combine(slot_at.date(), time.min, tzinfo=timezone.utc),
        datetime.combine(slot_at.date() + timedelta(days=1), time.min, tzinfo=timezone.utc),
        exclude_booking_id=exclude_booking_id,
    )
    if _overlaps(slot_at, end_at, busy):
        return False, 'That slot is no longer available.'

    return True, None


def ensure_storefront(business_provider) -> BeautyProvider:
    """
    Return the BeautyProvider storefront linked to this BusinessProvider,
    creating one if it doesn't yet exist. Idempotent.
    """
    storefront = BeautyProvider.objects.filter(business_provider_id=business_provider.id).first()
    if storefront is not None:
        return storefront
    storefront = BeautyProvider.objects.create(
        name=business_provider.business_name,
        short_description='',
        long_description='',
        location_label='',
        business_provider_id=business_provider.id,
    )
    # Seed default weekly hours so the calendar renders immediately.
    get_weekly_hours(storefront)
    return storefront


def get_storefront(business_provider_id: int) -> BeautyProvider | None:
    return BeautyProvider.objects.filter(business_provider_id=business_provider_id).first()
