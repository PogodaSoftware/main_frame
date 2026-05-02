"""
Beauty Business Service Form Resolver
=====================================
Renders the add/edit form for a single service. The same screen handles
both flows — when `params.serviceId == 'new'` it's an add form, otherwise
it's an edit form pre-populated with the service's current values.

Auth required — non-business users are redirected to the business login.
"""

from beauty_api.availability_service import ensure_storefront
from beauty_api.models import BeautyService
from ..services import hateoas_service as h
from ..services.application_gate import (
    redirect_to_wizard_if_incomplete,
    resolve_business_or_redirect,
)


CATEGORY_OPTIONS = [
    {'value': 'facial', 'label': 'Facial'},
    {'value': 'massage', 'label': 'Massage'},
    {'value': 'nails', 'label': 'Nails'},
    {'value': 'hair', 'label': 'Hair'},
]


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    business, app, redirect = resolve_business_or_redirect(request, device_id)
    if redirect is not None:
        return redirect
    gate = redirect_to_wizard_if_incomplete(app)
    if gate is not None:
        return gate

    storefront = ensure_storefront(business)
    raw_id = (params or {}).get('serviceId') or 'new'

    is_edit = False
    svc = None
    if raw_id != 'new':
        try:
            svc = BeautyService.objects.get(id=int(raw_id), provider=storefront)
            is_edit = True
        except (BeautyService.DoesNotExist, ValueError, TypeError):
            return h.redirect_envelope('beauty_business_services', 'service_not_found')

    if is_edit:
        submit_href = f'/api/beauty/protected/business/services/{svc.id}/'
        submit_method = 'PUT'
        submit_label = 'Save changes'
        title = f'Edit · {svc.name}'
        defaults = {
            'name': svc.name,
            'description': svc.description,
            'category': svc.category,
            'price_cents': svc.price_cents,
            'duration_minutes': svc.duration_minutes,
        }
    else:
        submit_href = '/api/beauty/protected/business/services/'
        submit_method = 'POST'
        submit_label = 'Create service'
        title = 'Add a service'
        defaults = {
            'name': '',
            'description': '',
            'category': 'facial',
            'price_cents': 5000,
            'duration_minutes': 60,
        }

    form = {
        'title': title,
        'submit_method': submit_method,
        'submit_href': submit_href,
        'success_screen': 'beauty_business_services',
        'submit_label': submit_label,
        'fields': [
            {'name': 'name', 'type': 'text', 'label': 'Service name', 'required': True, 'value': defaults['name']},
            {'name': 'category', 'type': 'select', 'label': 'Category', 'required': True, 'value': defaults['category'], 'options': CATEGORY_OPTIONS},
            {'name': 'description', 'type': 'text', 'label': 'Description', 'required': False, 'value': defaults['description']},
            {'name': 'price_cents', 'type': 'number', 'label': 'Price (cents)', 'required': True, 'value': defaults['price_cents'], 'min': 0},
            {'name': 'duration_minutes', 'type': 'number', 'label': 'Duration (minutes)', 'required': True, 'value': defaults['duration_minutes'], 'min': 15, 'max': 480},
        ],
    }

    return {
        'action': 'render',
        'screen': 'beauty_business_service_form',
        'data': {
            'is_edit': is_edit,
            'service_id': svc.id if svc else None,
            'form': form,
        },
        'meta': {'title': title},
        '_links': {
            'self': h.self_link(
                'beauty_business_service_form',
                params={'serviceId': raw_id},
            ),
            'cancel': h.screen_link(
                'cancel', 'beauty_business_services', prompt='Cancel',
            ),
            'business_home': h.screen_link(
                'business_home', 'beauty_business_home', prompt='Dashboard',
            ),
        },
    }
