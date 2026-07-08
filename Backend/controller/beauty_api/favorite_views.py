"""
Beauty Favorites Views
======================
Customer-only saved-services endpoints. Business accounts cannot
favorite — `_require_customer` returns 403 for any non-customer
session.

Endpoints
---------
GET    /api/beauty/protected/favorites/                       list
POST   /api/beauty/protected/services/<int>/favorite/         add (idempotent)
DELETE /api/beauty/protected/services/<int>/favorite/         remove (idempotent)
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .booking_views import (
    _provider_to_dict,
    _require_authenticated,
    _require_customer,
)
from .models import BeautyFavorite, BeautyService


def _favorite_payload(fav: BeautyFavorite) -> dict:
    svc = fav.service
    return {
        'id': fav.id,
        'created_at': fav.created_at.isoformat(),
        'service': {
            'id': svc.id,
            'name': svc.name,
            'description': svc.description,
            'category': svc.category,
            'price_cents': svc.price_cents,
            'duration_minutes': svc.duration_minutes,
        },
        'provider': _provider_to_dict(svc.provider),
    }


class FavoriteListView(APIView):
    """GET /api/beauty/protected/favorites/"""

    def get(self, request):
        err = _require_authenticated(request)
        if err:
            return err
        customer_id = _require_customer(request)
        if customer_id is None:
            return Response(
                {'detail': 'Only customers have a saved list.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        rows = (
            BeautyFavorite.objects
            .filter(customer_id=customer_id)
            .select_related('service', 'service__provider')
            .order_by('-created_at', '-id')
        )
        items = [_favorite_payload(r) for r in rows]
        return Response({'items': items, 'count': len(items)}, status=status.HTTP_200_OK)


class ServiceFavoriteView(APIView):
    """POST /api/beauty/protected/services/<service_id>/favorite/
       DELETE /api/beauty/protected/services/<service_id>/favorite/"""

    def post(self, request, service_id: int):
        err = _require_authenticated(request)
        if err:
            return err
        customer_id = _require_customer(request)
        if customer_id is None:
            return Response(
                {'detail': 'Only customers can favorite services.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not BeautyService.objects.filter(id=service_id).exists():
            return Response({'detail': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)

        fav, created = BeautyFavorite.objects.get_or_create(
            customer_id=customer_id, service_id=service_id,
        )
        body = {
            'id': fav.id,
            'service_id': service_id,
            'is_favorited': True,
            'created': created,
        }
        return Response(body, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request, service_id: int):
        err = _require_authenticated(request)
        if err:
            return err
        customer_id = _require_customer(request)
        if customer_id is None:
            return Response(
                {'detail': 'Only customers can unfavorite services.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        BeautyFavorite.objects.filter(
            customer_id=customer_id, service_id=service_id,
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
