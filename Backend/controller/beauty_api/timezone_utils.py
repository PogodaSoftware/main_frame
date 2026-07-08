"""
Beauty Timezone Resolution (core, single source of truth)
=========================================================
Canonical IANA-timezone resolution for a ``BeautyProvider``. Every consumer
— slot generation, calendar bucketing, and the BFF resolvers that tell the
client *whose clock a time is on* — resolves through here so they never
disagree.

Resolution order:
  1. The explicit ``provider.timezone`` column when set (the provider chose
     it, auto-detected from their device at onboarding).
  2. A best-guess from ``provider.location_label`` ("City, ST") via the
     most-populous zone per state — for catalog rows that predate the column.
  3. ``DEFAULT_TZ``.

Always returns a non-empty IANA string safe for ``zoneinfo.ZoneInfo`` and
``Intl.DateTimeFormat({ timeZone })``.
"""

from __future__ import annotations

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# Most-populous IANA zone keyed by USPS state code.
_STATE_TZ: dict[str, str] = {
    'AL': 'America/Chicago', 'AK': 'America/Anchorage', 'AZ': 'America/Phoenix',
    'AR': 'America/Chicago', 'CA': 'America/Los_Angeles', 'CO': 'America/Denver',
    'CT': 'America/New_York', 'DC': 'America/New_York', 'DE': 'America/New_York',
    'FL': 'America/New_York', 'GA': 'America/New_York', 'HI': 'Pacific/Honolulu',
    'IA': 'America/Chicago', 'ID': 'America/Boise', 'IL': 'America/Chicago',
    'IN': 'America/Indiana/Indianapolis', 'KS': 'America/Chicago', 'KY': 'America/New_York',
    'LA': 'America/Chicago', 'MA': 'America/New_York', 'MD': 'America/New_York',
    'ME': 'America/New_York', 'MI': 'America/Detroit', 'MN': 'America/Chicago',
    'MO': 'America/Chicago', 'MS': 'America/Chicago', 'MT': 'America/Denver',
    'NC': 'America/New_York', 'ND': 'America/Chicago', 'NE': 'America/Chicago',
    'NH': 'America/New_York', 'NJ': 'America/New_York', 'NM': 'America/Denver',
    'NV': 'America/Los_Angeles', 'NY': 'America/New_York', 'OH': 'America/New_York',
    'OK': 'America/Chicago', 'OR': 'America/Los_Angeles', 'PA': 'America/New_York',
    'RI': 'America/New_York', 'SC': 'America/New_York', 'SD': 'America/Chicago',
    'TN': 'America/Chicago', 'TX': 'America/Chicago', 'UT': 'America/Denver',
    'VA': 'America/New_York', 'VT': 'America/New_York', 'WA': 'America/Los_Angeles',
    'WI': 'America/Chicago', 'WV': 'America/New_York', 'WY': 'America/Denver',
}

DEFAULT_TZ = 'America/New_York'


def resolve_timezone(provider) -> str:
    """Return the effective IANA timezone string for a provider."""
    explicit = getattr(provider, 'timezone', None)
    if isinstance(explicit, str) and explicit.strip():
        return explicit.strip()

    loc = (getattr(provider, 'location_label', '') or '').strip()
    if loc:
        parts = [p.strip() for p in loc.replace(';', ',').split(',') if p.strip()]
        for token in reversed(parts):
            head = token.split()[0].upper() if token.split() else ''
            if len(head) == 2 and head.isalpha() and head in _STATE_TZ:
                return _STATE_TZ[head]
    return DEFAULT_TZ


def resolve_zoneinfo(provider) -> ZoneInfo:
    """Return the provider's effective zone as a ``ZoneInfo`` (UTC on failure)."""
    try:
        return ZoneInfo(resolve_timezone(provider))
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo('UTC')
