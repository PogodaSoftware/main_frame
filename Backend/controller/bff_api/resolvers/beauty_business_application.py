"""
Beauty Business Application Resolver
=====================================
Backs the 5-step onboarding wizard new business providers complete after
sign-up. The resolver always returns the full state for the application
(every step's saved values + the catalogue of options the wizard renders),
along with HATEOAS links the Angular wizard component uses to save each
step and submit the application.

Steps
-----
1. Identity & address — applicant kind (person / business), name, ITIN,
   business name, full address.
2. Services offered  — multi-select over the 4 marketplace categories.
3. Stripe placeholder — single confirm checkbox for the demo.
4. Schedule template — 7-day weekly grid (reused from availability).
5. Third-party tools + Terms of Service acceptance.

If the signed-in business has already completed the application we
redirect them straight to the dashboard so they never see the wizard
twice.
"""

from beauty_api.availability_service import ensure_storefront, get_weekly_hours
from beauty_api.business_views import VALID_THIRD_PARTY_TOOLS, _application_to_dict
from beauty_api.models import BeautyService, BusinessApplication
from ..services import hateoas_service as h
from ..services.business_gate import require_business


_SERVICE_CATALOG = [
    {'slug': c[0], 'label': c[1]}
    for c in BeautyService.CATEGORY_CHOICES
]

_THIRD_PARTY_CATALOG = [
    {'slug': 'google_calendar', 'label': 'Google Calendar'},
    {'slug': 'apple_calendar', 'label': 'Apple Calendar'},
    {'slug': 'mailchimp', 'label': 'Mailchimp'},
    {'slug': 'square_pos', 'label': 'Square POS'},
    {'slug': 'instagram', 'label': 'Instagram'},
    {'slug': 'tiktok', 'label': 'TikTok'},
    {'slug': 'yelp', 'label': 'Yelp'},
]
# Sanity check — the resolver catalog must stay in sync with the
# whitelist enforced by the REST view, otherwise the UI could offer a
# tool the API rejects.
assert {item['slug'] for item in _THIRD_PARTY_CATALOG} == VALID_THIRD_PARTY_TOOLS


_TOS_TEXT = (
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. By accepting '
    'these terms you agree to operate in good faith, comply with all local '
    'licensing requirements for the services you offer, and remit applicable '
    'taxes. Beauty is a marketplace and is not a party to the services you '
    'provide. Cancellations follow the standard policy displayed on each '
    'booking. You may withdraw from the marketplace at any time.'
)


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    business, redirect = require_business(request, device_id)
    if redirect:
        return redirect

    # If the business already finished onboarding, send them home.
    if business.application_completed:
        return h.redirect_envelope('beauty_business_home', 'already_onboarded')

    # Make sure the storefront row exists so step 4 has somewhere to apply.
    ensure_storefront(business)

    app, _ = BusinessApplication.objects.get_or_create(business=business)
    snapshot = _application_to_dict(app)

    # Default schedule template = current weekly hours so the wizard
    # starts with sensible values instead of empty rows.
    storefront = ensure_storefront(business)
    schedule_default = snapshot['schedule_template'] or get_weekly_hours(storefront)

    save_link = h.link(
        rel='save_step',
        href='/api/beauty/protected/business/application/',
        method='POST',
        prompt='Save & continue',
    )
    submit_link = h.link(
        rel='submit_application',
        href='/api/beauty/protected/business/application/submit/',
        method='POST',
        prompt='Submit application',
    )

    return {
        'action': 'render',
        'screen': 'beauty_business_application',
        'data': {
            'business': {
                'email': business.email,
                'business_name': business.business_name,
                'first_name': business.first_name,
                'last_name': business.last_name,
            },
            'application': snapshot,
            'schedule_default': schedule_default,
            'catalog': {
                'services': _SERVICE_CATALOG,
                'third_party_tools': _THIRD_PARTY_CATALOG,
                'applicant_kinds': [
                    {'value': 'person', 'label': 'Individual / Sole Proprietor'},
                    {'value': 'business', 'label': 'Registered Business'},
                ],
            },
            'tos_text': _TOS_TEXT,
            'submit_links': {
                'save_step': save_link,
                'submit_application': submit_link,
            },
        },
        'meta': {'title': 'Beauty - Become a Provider'},
        '_links': {
            'self': h.self_link('beauty_business_application'),
            'home': h.screen_link('home', 'beauty_home', prompt='Beauty'),
            'success': h.screen_link(
                'success', 'beauty_business_home', prompt='Open dashboard',
            ),
            'logout': h.link(
                rel='logout',
                href='/api/beauty/business/logout/',
                method='POST',
                screen='beauty_home',
                route=h.SCREEN_ROUTES['beauty_home'],
                prompt='Sign out',
            ),
        },
    }
