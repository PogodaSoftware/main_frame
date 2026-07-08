"""
Admin resolver datetime helpers
=================================
Shared humanizers used by beauty_admin_portal_customer_detail,
beauty_admin_portal_provider_detail, and beauty_admin_portal_booking_detail.

Output strings are UI-facing; keep byte-identical to the originals.

NOTE: beauty_admin_portal_crm._humanize_dt uses '%b %Y' (month-only) and
is intentionally NOT merged here — different format, different purpose.
"""

from datetime import datetime, timezone


_MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
_WEEKDAY_ABBR = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']


def humanize_dt(dt) -> str:
    """Format a datetime as 'Mon D, YYYY' (e.g. 'Jun 3, 2025'). Returns '—' for falsy input."""
    if not dt:
        return '—'
    return dt.strftime('%b %-d, %Y') if hasattr(dt, 'strftime') else str(dt)


def humanize_relative(dt) -> str:
    """Format a datetime as a relative human label ('just now', '3m ago', etc.)."""
    if not dt:
        return '—'
    delta = datetime.now(timezone.utc) - dt
    s = int(delta.total_seconds())
    if s < 60:
        return 'just now'
    if s < 3600:
        return f'{s // 60}m ago'
    if s < 86400:
        return f'{s // 3600}h ago'
    return f'{s // 86400}d ago'


def date_parts(dt) -> dict:
    """Decompose a datetime into {'mon': 'JAN', 'day': 3, 'weekday': 'FRI'} for UI cards."""
    if not dt:
        return {'mon': '—', 'day': 0, 'weekday': '—'}
    return {
        'mon': _MONTH_ABBR[dt.month - 1],
        'day': dt.day,
        'weekday': _WEEKDAY_ABBR[dt.weekday()],
    }
