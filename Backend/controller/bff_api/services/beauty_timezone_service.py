"""
Beauty Timezone Helper (BFF re-export)
======================================
Thin BFF-layer alias over the canonical core resolver in
``beauty_api.timezone_utils`` so resolvers can keep importing
``provider_timezone`` while slot generation, calendar bucketing, and the
client all resolve a provider's zone through one source of truth.
"""

from __future__ import annotations

from beauty_api.timezone_utils import DEFAULT_TZ, resolve_timezone

__all__ = ['DEFAULT_TZ', 'provider_timezone']


def provider_timezone(provider) -> str:
    """Effective IANA timezone for a BeautyProvider (column -> location ->
    default). Always non-empty — safe for ``Intl.DateTimeFormat`` / zoneinfo.
    """
    return resolve_timezone(provider)
