"""
Beauty Review Views
===================
Customer-written 1-5 star reviews of `BeautyService` rows. Business
owners can post one editable reply per review. Business accounts
cannot post reviews and cannot edit/delete reviews; the rule is
enforced here so the model stays write-symmetric.

Eligibility
-----------
A customer may post a review for a service only if they have at least
one `BeautyBooking` for that service with `status = 'completed'`. One
review per (customer, service) — uniqueness enforced both at the DB
level (UniqueConstraint) and surfaced in the create handler as 409.

Endpoints
---------
GET    /api/beauty/services/<int>/reviews/             list+aggregate
POST   /api/beauty/protected/services/<int>/reviews/   write
PATCH  /api/beauty/protected/reviews/<int>/            edit own
DELETE /api/beauty/protected/reviews/<int>/            delete own
GET    /api/beauty/protected/business/reviews/         business inbox
POST   /api/beauty/protected/business/reviews/<int>/reply/  write reply
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from django.db.models import Avg, Count
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .booking_views import _require_authenticated, _require_customer
from .models import (
    BeautyBooking,
    BeautyProvider,
    BeautyReview,
    BeautyService,
    BeautySession,
    BusinessProvider,
)


def _booking_finished_at(b: BeautyBooking) -> datetime:
    """Wall-clock end of the booking's service slot."""
    duration = (
        b.service_duration_minutes_at_booking
        or (b.service.duration_minutes if b.service_id else 0)
        or 0
    )
    return b.slot_at + timedelta(minutes=int(duration))


def _is_review_eligible(b: BeautyBooking, *, now: datetime) -> bool:
    """A booking is review-eligible when it has either:
       - already been explicitly marked completed, OR
       - elapsed (slot_at + duration < now) and is still in the BOOKED state.
    Cancelled bookings are never review-eligible.
    """
    if b.status in BeautyBooking.CANCELLED_STATUSES:
        return False
    if b.status == BeautyBooking.STATUS_COMPLETED:
        return True
    if b.status == BeautyBooking.STATUS_BOOKED and _booking_finished_at(b) <= now:
        return True
    return False


REVIEW_LIST_DEFAULT_LIMIT = 20
REVIEW_LIST_MAX_LIMIT = 50


def _require_business(request) -> int | None:
    if getattr(request, 'beauty_user_type', None) != BeautySession.USER_TYPE_BUSINESS:
        return None
    return getattr(request, 'beauty_user_id', None)


def _coerce_int(value, default: int, *, minimum: int = 0, maximum: int | None = None) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    if n < minimum:
        return minimum
    if maximum is not None and n > maximum:
        return maximum
    return n


def _coerce_rating(value) -> int | None:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return None
    if n < 1 or n > 5:
        return None
    return n


def _review_payload(r: BeautyReview, *, viewer_user_id: int | None, viewer_user_type: str | None) -> dict:
    is_owner = (
        viewer_user_type == BeautySession.USER_TYPE_CUSTOMER
        and viewer_user_id == r.customer_id
    )
    customer_email = r.customer.email if r.customer_id else ''
    initial = (customer_email[:1] or '?').upper()
    # No first/last name on BeautyUser — derive a friendly display name from
    # the email local-part (e.g. "maria.lopez@…" → "Maria"). Reviews are
    # public on the storefront, so this is safe to surface.
    _local = customer_email.split('@', 1)[0] if customer_email else ''
    _first = _local.replace('.', ' ').replace('_', ' ').split(' ')[0]
    display_name = _first[:1].upper() + _first[1:] if _first else 'Guest'
    return {
        'id': r.id,
        'rating': r.rating,
        'body': r.body,
        'business_reply': r.business_reply,
        'business_reply_at': r.business_reply_at.isoformat() if r.business_reply_at else None,
        'created_at': r.created_at.isoformat(),
        'updated_at': r.updated_at.isoformat(),
        'is_owner': is_owner,
        'service': {
            'id': r.service_id,
            'name': r.service.name if r.service_id else '',
            'provider_id': r.service.provider_id if r.service_id else None,
        },
        'customer': {
            'id': r.customer_id,
            'initial': initial,
            'display_name': display_name,
        },
    }


def _aggregate_for_service(service_id: int) -> dict:
    agg = BeautyReview.objects.filter(service_id=service_id).aggregate(
        avg=Avg('rating'), count=Count('id'),
    )
    return {
        'avg_rating': float(agg['avg']) if agg['avg'] is not None else None,
        'count': int(agg['count'] or 0),
    }


class ServiceReviewsListView(APIView):
    """GET /api/beauty/services/<service_id>/reviews/"""

    def get(self, request, service_id: int):
        err = _require_authenticated(request)
        if err:
            return err
        if not BeautyService.objects.filter(id=service_id).exists():
            return Response({'detail': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)

        offset = _coerce_int(request.GET.get('offset'), 0, minimum=0)
        limit = _coerce_int(
            request.GET.get('limit'), REVIEW_LIST_DEFAULT_LIMIT,
            minimum=1, maximum=REVIEW_LIST_MAX_LIMIT,
        )

        qs = (
            BeautyReview.objects
            .filter(service_id=service_id)
            .select_related('customer', 'service')
            .order_by('-created_at', '-id')
        )
        window = list(qs[offset:offset + limit + 1])
        has_more = len(window) > limit
        page = window[:limit]

        viewer_user_id = getattr(request, 'beauty_user_id', None)
        viewer_user_type = getattr(request, 'beauty_user_type', None)

        return Response({
            'items': [
                _review_payload(r, viewer_user_id=viewer_user_id, viewer_user_type=viewer_user_type)
                for r in page
            ],
            'has_more': has_more,
            'next_offset': offset + len(page) if has_more else None,
            'aggregate': _aggregate_for_service(service_id),
        }, status=status.HTTP_200_OK)


class ServiceReviewCreateView(APIView):
    """POST /api/beauty/protected/services/<service_id>/reviews/"""

    def post(self, request, service_id: int):
        err = _require_authenticated(request)
        if err:
            return err
        customer_id = _require_customer(request)
        if customer_id is None:
            return Response(
                {'detail': 'Only customers can write reviews.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            service = BeautyService.objects.get(id=service_id)
        except BeautyService.DoesNotExist:
            return Response({'detail': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)

        rating = _coerce_rating(request.data.get('rating'))
        if rating is None:
            return Response({'detail': 'rating must be an integer 1..5'}, status=status.HTTP_400_BAD_REQUEST)
        body = (request.data.get('body') or '').strip()
        if len(body) > 4000:
            return Response({'detail': 'body too long (max 4000 chars)'}, status=status.HTTP_400_BAD_REQUEST)

        now = datetime.now(timezone.utc)
        candidate_bookings = (
            BeautyBooking.objects
            .select_related('service')
            .filter(customer_id=customer_id, service_id=service.id)
            .order_by('-slot_at')
        )
        completed_booking = next(
            (b for b in candidate_bookings if _is_review_eligible(b, now=now)),
            None,
        )
        if completed_booking is None:
            return Response(
                {'detail': 'You can only review a service after the appointment has finished.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if BeautyReview.objects.filter(customer_id=customer_id, service_id=service.id).exists():
            return Response(
                {'detail': 'You have already reviewed this service.'},
                status=status.HTTP_409_CONFLICT,
            )

        review = BeautyReview.objects.create(
            customer_id=customer_id,
            service_id=service.id,
            booking=completed_booking,
            rating=rating,
            body=body,
        )
        review.refresh_from_db()
        return Response(
            _review_payload(
                review,
                viewer_user_id=customer_id,
                viewer_user_type=BeautySession.USER_TYPE_CUSTOMER,
            ),
            status=status.HTTP_201_CREATED,
        )


class ReviewMineView(APIView):
    """PATCH/DELETE /api/beauty/protected/reviews/<review_id>/"""

    def _get_owned(self, request, review_id: int):
        err = _require_authenticated(request)
        if err:
            return None, err
        customer_id = _require_customer(request)
        if customer_id is None:
            return None, Response(
                {'detail': 'Only customers can edit reviews.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            review = BeautyReview.objects.select_related('service', 'customer').get(id=review_id)
        except BeautyReview.DoesNotExist:
            return None, Response({'detail': 'Review not found.'}, status=status.HTTP_404_NOT_FOUND)
        if review.customer_id != customer_id:
            return None, Response({'detail': 'Review not found.'}, status=status.HTTP_404_NOT_FOUND)
        return review, None

    def patch(self, request, review_id: int):
        review, err = self._get_owned(request, review_id)
        if err:
            return err
        changed = False
        if 'rating' in request.data:
            new_rating = _coerce_rating(request.data.get('rating'))
            if new_rating is None:
                return Response({'detail': 'rating must be an integer 1..5'}, status=status.HTTP_400_BAD_REQUEST)
            review.rating = new_rating
            changed = True
        if 'body' in request.data:
            new_body = (request.data.get('body') or '').strip()
            if len(new_body) > 4000:
                return Response({'detail': 'body too long (max 4000 chars)'}, status=status.HTTP_400_BAD_REQUEST)
            review.body = new_body
            changed = True
        if changed:
            review.save(update_fields=['rating', 'body', 'updated_at'])
        return Response(
            _review_payload(
                review,
                viewer_user_id=review.customer_id,
                viewer_user_type=BeautySession.USER_TYPE_CUSTOMER,
            ),
            status=status.HTTP_200_OK,
        )

    def delete(self, request, review_id: int):
        review, err = self._get_owned(request, review_id)
        if err:
            return err
        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _business_owned_provider_ids(business_user_id: int) -> set[int]:
    return set(
        BeautyProvider.objects
        .filter(business_provider_id=business_user_id)
        .values_list('id', flat=True)
    )


class BusinessReviewsListView(APIView):
    """GET /api/beauty/protected/business/reviews/"""

    def get(self, request):
        err = _require_authenticated(request)
        if err:
            return err
        business_id = _require_business(request)
        if business_id is None:
            return Response({'detail': 'Business session required.'}, status=status.HTTP_403_FORBIDDEN)
        if not BusinessProvider.objects.filter(id=business_id).exists():
            return Response({'detail': 'Business session required.'}, status=status.HTTP_403_FORBIDDEN)

        provider_ids = _business_owned_provider_ids(business_id)
        if not provider_ids:
            return Response({'items': [], 'has_more': False, 'next_offset': None}, status=status.HTTP_200_OK)

        offset = _coerce_int(request.GET.get('offset'), 0, minimum=0)
        limit = _coerce_int(
            request.GET.get('limit'), REVIEW_LIST_DEFAULT_LIMIT,
            minimum=1, maximum=REVIEW_LIST_MAX_LIMIT,
        )

        qs = (
            BeautyReview.objects
            .filter(service__provider_id__in=provider_ids)
            .select_related('customer', 'service', 'service__provider')
            .order_by('-created_at', '-id')
        )
        window = list(qs[offset:offset + limit + 1])
        has_more = len(window) > limit
        page = window[:limit]

        return Response({
            'items': [
                _review_payload(r, viewer_user_id=business_id, viewer_user_type=BeautySession.USER_TYPE_BUSINESS)
                for r in page
            ],
            'has_more': has_more,
            'next_offset': offset + len(page) if has_more else None,
        }, status=status.HTTP_200_OK)


class BusinessReviewReplyView(APIView):
    """POST /api/beauty/protected/business/reviews/<review_id>/reply/"""

    def post(self, request, review_id: int):
        err = _require_authenticated(request)
        if err:
            return err
        business_id = _require_business(request)
        if business_id is None:
            return Response({'detail': 'Business session required.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            review = BeautyReview.objects.select_related('service').get(id=review_id)
        except BeautyReview.DoesNotExist:
            return Response({'detail': 'Review not found.'}, status=status.HTTP_404_NOT_FOUND)

        provider_ids = _business_owned_provider_ids(business_id)
        if review.service.provider_id not in provider_ids:
            return Response({'detail': 'Not authorized for this review.'}, status=status.HTTP_403_FORBIDDEN)

        reply = (request.data.get('reply') or '').strip()
        if not reply:
            return Response({'detail': 'reply cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        if len(reply) > 4000:
            return Response({'detail': 'reply too long (max 4000 chars)'}, status=status.HTTP_400_BAD_REQUEST)

        review.business_reply = reply
        review.business_reply_at = datetime.now(timezone.utc)
        review.save(update_fields=['business_reply', 'business_reply_at', 'updated_at'])
        return Response(
            _review_payload(
                review,
                viewer_user_id=business_id,
                viewer_user_type=BeautySession.USER_TYPE_BUSINESS,
            ),
            status=status.HTTP_200_OK,
        )
