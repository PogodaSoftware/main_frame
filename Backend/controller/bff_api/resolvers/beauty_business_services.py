"""
Beauty Business Services Resolver
=================================
Lists every service offered by the signed-in business provider's
storefront, with HATEOAS links to add a new service, edit any existing
one, or delete one.

Auth required — non-business users are redirected to the business login.
"""

from beauty_api.availability_service import ensure_storefront
from beauty_api.models import BeautyService
from ..services import hateoas_service as h
from ..services.application_gate import (
    redirect_to_wizard_if_incomplete,
    resolve_business_or_redirect,
)


CATEGORY_LABELS = {
    'facial': 'Facial',
    'massage': 'Massage',
    'nails': 'Nails',
    'hair': 'Hair',
}


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    business, app, redirect = resolve_business_or_redirect(request, device_id)
    if redirect is not None:
        return redirect
    gate = redirect_to_wizard_if_incomplete(app)
    if gate is not None:
        return gate

    storefront = ensure_storefront(business)
    services = list(BeautyService.objects.filter(provider=storefront).order_by('category', 'name'))

    items = []
    for svc in services:
        items.append({
            'id': svc.id,
            'name': svc.name,
            'description': svc.description,
            'category': svc.category,
            'category_label': CATEGORY_LABELS.get(svc.category, svc.category.title()),
            'price_cents': svc.price_cents,
            'duration_minutes': svc.duration_minutes,
            '_links': {
                'edit': h.screen_link(
                    'edit', 'beauty_business_service_form',
                    prompt='Edit', params={'serviceId': svc.id},
                ),
                'delete': h.link(
                    rel='delete',
                    href=f'/api/beauty/protected/business/services/{svc.id}/',
                    method='DELETE',
                    screen='beauty_business_services',
                    route=h.SCREEN_ROUTES['beauty_business_services'],
                    prompt='Delete',
                ),
            },
        })

    links = {
        'self': h.self_link('beauty_business_services'),
        'business_home': h.screen_link(
            'business_home', 'beauty_business_home', prompt='Dashboard',
        ),
        'add': h.screen_link(
            'add', 'beauty_business_service_form',
            prompt='Add service', params={'serviceId': 'new'},
        ),
        'availability': h.screen_link(
            'availability', 'beauty_business_availability', prompt='Edit hours',
        ),
        'bookings': h.screen_link(
            'bookings', 'beauty_business_bookings', prompt='View bookings',
        ),
    }

    return {
        'action': 'render',
        'screen': 'beauty_business_services',
        'data': {
            'storefront': {'id': storefront.id, 'name': storefront.name},
            'services': items,
        },
        'meta': {'title': 'Manage services'},
        '_links': links,
    }
