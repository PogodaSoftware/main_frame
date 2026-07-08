"""
Beauty Provider Detail Resolver
===============================
Returns a provider profile with the full list of services. Each service
exposes a HATEOAS `book` link the shell uses to navigate into the booking
flow. Auth-gated — anonymous visitors are bounced to login.

`params` must contain `id` (the provider primary key).
"""

from datetime import datetime, timedelta, timezone

from django.db.models import Avg, Count

from beauty_api.availability_service import is_provider_publicly_visible
from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyBooking, BeautyFavorite, BeautyProvider, BeautyReview, BeautySession
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


REVIEW_PREVIEW_LIMIT = 10


def _booking_finished_at(b: BeautyBooking) -> datetime:
    duration = (
        b.service_duration_minutes_at_booking
        or (b.service.duration_minutes if b.service_id else 0)
        or 0
    )
    return b.slot_at + timedelta(minutes=int(duration))


def _is_review_eligible(b: BeautyBooking, *, now: datetime) -> bool:
    if b.status in BeautyBooking.CANCELLED_STATUSES:
        return False
    if b.status == BeautyBooking.STATUS_COMPLETED:
        return True
    if b.status == BeautyBooking.STATUS_BOOKED and _booking_finished_at(b) <= now:
        return True
    return False


def _serialize_review(r: BeautyReview, *, viewer_user_id: int | None, viewer_user_type: str | None) -> dict:
    is_owner = (
        viewer_user_type == BeautySession.USER_TYPE_CUSTOMER
        and viewer_user_id == r.customer_id
    )
    customer_email = r.customer.email if r.customer_id else ''
    initial = (customer_email[:1] or '?').upper()
    payload = {
        'id': r.id,
        'rating': r.rating,
        'body': r.body,
        'business_reply': r.business_reply,
        'business_reply_at': r.business_reply_at.isoformat() if r.business_reply_at else None,
        'created_at': r.created_at.isoformat(),
        'is_owner': is_owner,
        'service_id': r.service_id,
        'service_name': r.service.name if r.service_id else '',
        'customer_initial': initial,
        '_links': {},
    }
    # Customers can delete their own review (action-link).
    if is_owner:
        payload['_links']['delete'] = h.link(
            rel='delete',
            href=f'/api/beauty/protected/reviews/{r.id}/',
            method='DELETE', prompt='Delete',
        )
    return payload


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user:
        return h.redirect_envelope('beauty_login', 'auth_required')

    params = params or {}
    raw_id = params.get('id')
    try:
        provider_id = int(raw_id)
    except (TypeError, ValueError):
        return h.redirect_envelope('beauty_home', 'invalid_provider')

    try:
        provider = BeautyProvider.objects.prefetch_related('services').get(id=provider_id)
    except BeautyProvider.DoesNotExist:
        return h.redirect_envelope('beauty_home', 'provider_not_found')

    # An unapproved storefront must not be reachable even by direct id.
    if not is_provider_publicly_visible(provider):
        return h.redirect_envelope('beauty_home', 'provider_not_found')

    services = list(provider.services.all().order_by('category', 'name'))
    service_ids = [s.id for s in services]

    agg = (
        BeautyReview.objects
        .filter(service_id__in=service_ids)
        .aggregate(avg=Avg('rating'), count=Count('id'))
    )
    avg_rating = float(agg['avg']) if agg['avg'] is not None else None
    review_count = int(agg['count'] or 0)

    reviews_qs = (
        BeautyReview.objects
        .filter(service_id__in=service_ids)
        .select_related('customer', 'service')
        .order_by('-created_at', '-id')[:REVIEW_PREVIEW_LIMIT]
    )

    user_id = user.get('user_id') if isinstance(user, dict) else None
    user_type = user.get('user_type') if isinstance(user, dict) else None

    favorited_ids: set[int] = set()
    if user_type == BeautySession.USER_TYPE_CUSTOMER and user_id:
        favorited_ids = set(
            BeautyFavorite.objects
            .filter(customer_id=user_id, service_id__in=service_ids)
            .values_list('service_id', flat=True)
        )

    can_review = False
    review_booking_id: int | None = None
    review_service_name: str | None = None
    review_visited_at = None
    if user_type == BeautySession.USER_TYPE_CUSTOMER and user_id:
        now = datetime.now(timezone.utc)
        already_reviewed_service_ids = set(
            BeautyReview.objects
            .filter(customer_id=user_id, service_id__in=service_ids)
            .values_list('service_id', flat=True)
        )
        candidate_qs = (
            BeautyBooking.objects
            .select_related('service')
            .filter(customer_id=user_id, service_id__in=service_ids)
            .exclude(service_id__in=already_reviewed_service_ids)
            .order_by('-slot_at')
        )
        for b in candidate_qs:
            if _is_review_eligible(b, now=now):
                can_review = True
                review_booking_id = b.id
                review_service_name = b.service.name if b.service_id else None
                review_visited_at = b.slot_at
                break

    links: dict = {
        'self': h.self_link('beauty_provider_detail', params={'id': provider.id}),
        'home': h.screen_link('home', 'beauty_home', prompt='Home'),
        'chats': h.screen_link('chats', 'beauty_chats', prompt='Chat'),
        'profile': h.screen_link('profile', 'beauty_profile', prompt='Profile'),
    }
    if can_review and review_booking_id is not None:
        links['write_review'] = {
            'href': f'/pogoda/beauty/bookings/{review_booking_id}/review',
            'method': 'GET',
            'rel': 'write_review',
            'prompt': 'Leave a review',
            'screen': 'beauty_review_write',
            'route': f'/pogoda/beauty/bookings/{review_booking_id}/review',
        }

    return {
        'action': 'render',
        'screen': 'beauty_provider_detail',
        'data': {
            'provider': {
                'id': provider.id,
                'name': provider.name,
                'short_description': provider.short_description,
                'long_description': provider.long_description,
                'location_label': provider.location_label,
                'avg_rating': avg_rating,
                'review_count': review_count,
            },
            'services': [
                {
                    'id': s.id,
                    'name': s.name,
                    'description': s.description,
                    'category': s.category,
                    'price_cents': s.price_cents,
                    'duration_minutes': s.duration_minutes,
                    'is_favorited': s.id in favorited_ids,
                    '_links': {
                        'book': h.screen_link(
                            'book', 'beauty_book',
                            prompt='Book', params={'serviceId': s.id},
                        ),
                        # POST favorite / DELETE unfavorite — same href.
                        **h.service_favorite_links(s.id),
                    },
                }
                for s in services
            ],
            'reviews': [
                _serialize_review(r, viewer_user_id=user_id, viewer_user_type=user_type)
                for r in reviews_qs
            ],
            'can_review': can_review,
            'review_eligible_booking_id': review_booking_id,
            'review_eligible_service_name': review_service_name,
            'review_eligible_visited_at': (
                review_visited_at.isoformat() if review_visited_at else None
            ),
        },
        'meta': {'title': f'Beauty — {provider.name}'},
        '_links': links,
    }
