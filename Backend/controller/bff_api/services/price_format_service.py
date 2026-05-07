"""Price formatting helpers for the Beauty BFF.

Resolvers emit both `price_cents` (legacy) and `price_dollars` (new dollar-
denominated string for the redesigned provider portal). Use `to_dollars`
when you have a `BeautyService` row, `cents_to_dollars` for raw cents.
"""

from decimal import Decimal


def cents_to_dollars(cents: int | None) -> str:
    """Format whole cents as `'120.00'` style string."""
    c = int(cents or 0)
    return f"{(Decimal(c) / Decimal(100)).quantize(Decimal('0.01')):.2f}"


def dollars_or_from_cents(price_dollars, price_cents) -> str:
    """Prefer the Decimal column when set, fall back to cents/100."""
    if price_dollars is not None:
        return f"{Decimal(price_dollars).quantize(Decimal('0.01')):.2f}"
    return cents_to_dollars(price_cents)
