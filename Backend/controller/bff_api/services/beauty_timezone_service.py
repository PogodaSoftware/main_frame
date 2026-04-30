"""
Beauty Timezone Helper
======================
`BeautyProvider` does not yet carry an explicit IANA timezone column. To
keep the frontend honest about *whose clock the slot is on* we derive a
best-guess IANA timezone from the provider's `location_label`
(typically "City, ST"). Anything we can't classify defaults to
``America/New_York`` — the dominant zone for the seeded data.

This is intentionally conservative; states that span multiple zones
(Indiana, Tennessee, Florida-panhandle, etc.) will use whichever zone
serves the largest population. When `BeautyProvider.timezone` ships,
swap callers to read that column directly.
"""

from __future__ import annotations

# Most-populous IANA zone keyed by USPS state code.
_STATE_TZ: dict[str, str] = {
    'AL': 'America/Chicago',
    'AK': 'America/Anchorage',
    'AZ': 'America/Phoenix',
    'AR': 'America/Chicago',
    'CA': 'America/Los_Angeles',
    'CO': 'America/Denver',
    'CT': 'America/New_York',
    'DC': 'America/New_York',
    'DE': 'America/New_York',
    'FL': 'America/New_York',
    'GA': 'America/New_York',
    'HI': 'Pacific/Honolulu',
    'IA': 'America/Chicago',
    'ID': 'America/Boise',
    'IL': 'America/Chicago',
    'IN': 'America/Indiana/Indianapolis',
    'KS': 'America/Chicago',
    'KY': 'America/New_York',
    'LA': 'America/Chicago',
    'MA': 'America/New_York',
    'MD': 'America/New_York',
    'ME': 'America/New_York',
    'MI': 'America/Detroit',
    'MN': 'America/Chicago',
    'MO': 'America/Chicago',
    'MS': 'America/Chicago',
    'MT': 'America/Denver',
    'NC': 'America/New_York',
    'ND': 'America/Chicago',
    'NE': 'America/Chicago',
    'NH': 'America/New_York',
    'NJ': 'America/New_York',
    'NM': 'America/Denver',
    'NV': 'America/Los_Angeles',
    'NY': 'America/New_York',
    'OH': 'America/New_York',
    'OK': 'America/Chicago',
    'OR': 'America/Los_Angeles',
    'PA': 'America/New_York',
    'RI': 'America/New_York',
    'SC': 'America/New_York',
    'SD': 'America/Chicago',
    'TN': 'America/Chicago',
    'TX': 'America/Chicago',
    'UT': 'America/Denver',
    'VA': 'America/New_York',
    'VT': 'America/New_York',
    'WA': 'America/Los_Angeles',
    'WI': 'America/Chicago',
    'WV': 'America/New_York',
    'WY': 'America/Denver',
}

DEFAULT_TZ = 'America/New_York'


def provider_timezone(provider) -> str:
    """Return an IANA timezone for a BeautyProvider.

    Reads ``provider.timezone`` if that column exists (forward-compat).
    Otherwise falls back to a state-derived guess from
    ``provider.location_label`` (e.g. "Brooklyn, NY"). Always returns a
    non-empty string so the frontend can pass it straight into
    ``Intl.DateTimeFormat``'s ``timeZone`` option.
    """
    explicit = getattr(provider, 'timezone', None)
    if isinstance(explicit, str) and explicit.strip():
        return explicit.strip()

    loc = (getattr(provider, 'location_label', '') or '').strip()
    if not loc:
        return DEFAULT_TZ

    # Look for ", XX" anywhere in the label (last 2-letter token wins).
    parts = [p.strip() for p in loc.replace(';', ',').split(',') if p.strip()]
    for token in reversed(parts):
        # The state segment may be "NY" or "NY 11201".
        head = token.split()[0].upper() if token.split() else ''
        if len(head) == 2 and head.isalpha() and head in _STATE_TZ:
            return _STATE_TZ[head]
    return DEFAULT_TZ
