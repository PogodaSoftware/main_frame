"""Beauty Business Reviews Resolver
====================================
Lists customer reviews for the signed-in provider's storefront, with
a reply link for each unanswered review.

Auth required — non-business users are redirected to business login.
"""

from beauty_api.availability_service import ensure_storefront
from beauty_api.models import BeautyReview
from ..services import hateoas_service as h
from ..services.application_gate import (
    redirect_to_wizard_if_incomplete,
    resolve_business_or_redirect,
)


def _initial(email: str) -> str:
    return (email.strip()[:1] or '?').upper()


def _display_name(email: str) -> str:
    """Friendly name from the email local-part (capitalized). The BeautyUser
    model has no name field, so the local-part is the best stable label."""
    local = (email or '').split('@', 1)[0]
    first = local.replace('.', ' ').replace('_', ' ').split(' ')[0]
    return (first[:1].upper() + first[1:]) if first else 'Guest'


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    business, app, redirect = resolve_business_or_redirect(request, device_id)
    if redirect is not None:
        return redirect
    gate = redirect_to_wizard_if_incomplete(app)
    if gate is not None:
        return gate

    storefront = ensure_storefront(business)
    reviews_qs = (
        BeautyReview.objects
        .select_related('booking__customer', 'booking__service')
        .filter(booking__service__provider=storefront)
        .order_by('-created_at')
    )

    items = []
    for rv in reviews_qs:
        booking = rv.booking
        email = booking.customer.email if booking and booking.customer else ''
        item = {
            'id': rv.id,
            'rating': rv.rating,
            'body': rv.body or '',
            'created_at': rv.created_at.isoformat(),
            'customer': {
                'initial': _initial(email),
                'display_name': _display_name(email),
            },
            'service': {'name': booking.service.name if booking and booking.service else ''},
            'business_reply': rv.business_reply or '',
            'business_reply_at': rv.business_reply_at.isoformat() if rv.business_reply_at else None,
            # Reply link is always present: the same endpoint creates AND edits
            # a reply, so the screen can post or revise inline.
            '_links': {
                'reply': h.link(
                    rel='reply',
                    href=f'/api/beauty/protected/business/reviews/{rv.id}/reply/',
                    method='POST',
                    prompt='Reply',
                ),
            },
        }
        items.append(item)

    return {
        'action': 'render',
        'screen': 'beauty_business_reviews',
        'data': {
            'storefront': {'id': storefront.id, 'name': storefront.name},
            'reviews': items,
            'total': len(items),
        },
        'meta': {'title': 'Customer reviews'},
        '_links': {
            'self': h.self_link('beauty_business_reviews'),
            'business_home': h.screen_link(
                'business_home', 'beauty_business_home', prompt='Dashboard',
            ),
            'profile': h.screen_link(
                'profile', 'beauty_business_profile', prompt='Profile',
            ),
        },
    }
