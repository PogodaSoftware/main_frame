"""Shared helpers for the business application wizard resolvers.

Each step resolver returns the same envelope shape so the Angular shell
component can dispatch by ``data.step`` without hard-coding URLs or
field names per screen.
"""

from beauty_api.business_views import _application_to_dict
from beauty_api.models import BusinessProviderApplication
from ..services import hateoas_service as h
from ..services.application_gate import resolve_business_or_redirect

WIZARD_STEPS = ['entity', 'services', 'stripe', 'schedule', 'tools', 'review']
STEP_TITLES = {
    'entity':   'About your business',
    'services': 'Services offered',
    'stripe':   'Payments setup',
    'schedule': 'Weekly hours',
    'tools':    'Third-party tools',
    'review':   'Review & submit',
}
STEP_SCREENS = {
    'entity':   'beauty_business_application_entity',
    'services': 'beauty_business_application_services',
    'stripe':   'beauty_business_application_stripe',
    'schedule': 'beauty_business_application_schedule',
    'tools':    'beauty_business_application_tools',
    'review':   'beauty_business_application_review',
}

CATEGORY_OPTIONS = [
    {'value': 'facial',  'label': 'Facials'},
    {'value': 'massage', 'label': 'Massage'},
    {'value': 'nails',   'label': 'Nails'},
    {'value': 'hair',    'label': 'Hair'},
]
TOOL_OPTIONS = [
    {'value': 'google_calendar', 'label': 'Google Calendar'},
    {'value': 'icloud',          'label': 'iCloud Calendar'},
    {'value': 'outlook',         'label': 'Outlook Calendar'},
    {'value': 'square',          'label': 'Square POS'},
    {'value': 'mindbody',        'label': 'Mindbody'},
    {'value': 'vagaro',          'label': 'Vagaro'},
]
TOS_TEXT = (
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do '
    'eiusmod tempor incididunt ut labore et dolore magna aliqua. By '
    'submitting this application you accept the placeholder Terms of '
    'Service and Privacy Policy displayed here. These terms are for '
    'demonstration only — replace with the production legal text before '
    'launch.'
)


def step_index(step: str) -> int:
    return WIZARD_STEPS.index(step) + 1


def neighbour_links(step: str, app: BusinessProviderApplication) -> dict:
    """Build prev/next/self/logout/dashboard links for a wizard screen."""
    idx = WIZARD_STEPS.index(step)
    out = {
        'self': h.self_link(STEP_SCREENS[step]),
        'logout': h.link(
            rel='logout',
            href='/api/beauty/business/logout/',
            method='POST',
            screen='beauty_home',
            route=h.SCREEN_ROUTES['beauty_home'],
            prompt='Sign out',
        ),
    }
    if idx > 0:
        prev_step = WIZARD_STEPS[idx - 1]
        out['prev'] = h.screen_link('prev', STEP_SCREENS[prev_step], prompt='Back')
    if idx < len(WIZARD_STEPS) - 1:
        next_step = WIZARD_STEPS[idx + 1]
        out['next'] = h.screen_link('next', STEP_SCREENS[next_step], prompt='Continue')
    if app.status == BusinessProviderApplication.STATUS_ACCEPTED:
        out['dashboard'] = h.screen_link(
            'dashboard', 'beauty_business_home', prompt='Go to dashboard',
        )
    return out


def base_data(step: str, app: BusinessProviderApplication, *, business) -> dict:
    return {
        'step': step,
        'step_index': step_index(step),
        'total_steps': len(WIZARD_STEPS),
        'step_title': STEP_TITLES[step],
        'application': _application_to_dict(app),
        'business': {
            'email': business.email,
            'business_name': business.business_name,
        },
        'submit_href': '/api/beauty/protected/business/application/',
        'submit_method': 'PATCH',
        'submit_step_key': step,
    }


def envelope(screen: str, step: str, request, device_id: str, *, extras: dict | None = None) -> dict:
    """Resolve auth + render a wizard envelope, or return a redirect."""
    business, app, redirect = resolve_business_or_redirect(request, device_id)
    if redirect is not None:
        return redirect
    data = base_data(step, app, business=business)
    if extras:
        data.update(extras)
    return {
        'action': 'render',
        'screen': screen,
        'data': data,
        'meta': {'title': f'Application · {STEP_TITLES[step]}'},
        '_links': neighbour_links(step, app),
    }
