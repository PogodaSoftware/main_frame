"""
Business resolver shared helpers
=================================
Small utilities shared by business-facing (non-wizard) resolvers.

``_initial`` and ``_display_name`` are used by both beauty_business_reviews
and beauty_business_profile.  ``CATEGORY_LABELS`` is used by
beauty_business_services and beauty_business_profile.

Output strings are UI-facing; keep byte-identical to the originals.
"""


CATEGORY_LABELS: dict[str, str] = {
    'facial': 'Facial',
    'massage': 'Massage',
    'nails': 'Nails',
    'hair': 'Hair',
}


def _initial(email: str) -> str:
    return (email.strip()[:1] or '?').upper()


def _display_name(email: str) -> str:
    """Friendly name from the email local-part (capitalised first word).
    The BeautyUser model has no name field so the local-part is the best
    stable label available.
    """
    local = (email or '').split('@', 1)[0]
    first = local.replace('.', ' ').replace('_', ' ').split(' ')[0]
    return (first[:1].upper() + first[1:]) if first else 'Guest'
