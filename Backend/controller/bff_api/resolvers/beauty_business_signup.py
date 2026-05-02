"""
Beauty Business Signup Resolver
================================
Returns the dynamic form schema for the business provider sign-up page.
A successful signup redirects the new business user into the multi-step
application form (`beauty_business_application`).
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


_PRESENTATION = {
    'page_class': 'signup-page business-signup-page',
    'main_class': 'signup-main',
    'title_class': 'signup-title',
    'subtitle_class': 'signup-subtitle',
    'form_class': 'signup-form',
    'submit_class': 'btn-continue btn-business',
    'header_brand_icon': '🏢',
    'header_brand_label': 'Beauty',
    'header_badge_text': 'Business Portal',
    'header_badge_class': 'business-badge',
    'footer_label': 'Already a provider?',
    'footer_class': 'signup-footer',
    'show_field_labels': True,
    'hide_top_header': True,
    'show_back_bar': True,
    'show_brand_block': True,
    'show_terms_checkbox': True,
    'show_or_divider': False,
    'show_social': False,
}


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    if not h.is_business_login_enabled():
        return h.redirect_envelope('beauty_login', 'feature_disabled')

    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)

    if user is not None:
        target = (
            'beauty_business_home'
            if user.get('user_type') == 'business'
            else 'beauty_home'
        )
        return h.redirect_envelope(target, 'already_authenticated')

    links = {
        'self': h.self_link('beauty_business_signup'),
        'home': h.screen_link('home', 'beauty_home', prompt='Beauty'),
        'back': h.screen_link('back', 'beauty_business_login', prompt='Back'),
        'login': h.screen_link(
            'login', 'beauty_business_login', prompt='Sign in',
        ),
    }

    fields = [
        h.field(
            'first_name',
            type='text',
            label='First name',
            placeholder='Jane',
            required=True,
            autocomplete='given-name',
            autocapitalize='words',
            error_messages={'required': 'First name is required.'},
        ),
        h.field(
            'last_name',
            type='text',
            label='Last name',
            placeholder='Doe',
            required=True,
            autocomplete='family-name',
            autocapitalize='words',
            error_messages={'required': 'Last name is required.'},
        ),
        h.field(
            'business_name',
            type='text',
            label='Business name',
            placeholder='Glow Studio',
            required=True,
            autocomplete='organization',
            autocapitalize='words',
            error_messages={'required': 'Business name is required.'},
        ),
        h.email_field(
            label='Business email',
            placeholder='owner@yourbusiness.com',
        ),
        h.password_field(
            placeholder='At least 8 characters',
            autocomplete='new-password',
            min_length=8,
        ),
    ]

    form = h.signup_form(
        title='Become a provider',
        subtitle='Set up your business account in under a minute.',
        submit_href='/api/beauty/business/signup/',
        submit_prompt='Create business account',
        success_screen='beauty_business_login',
        presentation=_PRESENTATION,
        fields=fields,
        footer_links=[
            h.footer_link(
                rel='login',
                cta_class='link-btn link-signup',
                group_class='signup-footer',
                label_prefix='Already a provider?',
            ),
        ],
    )

    return {
        'action': 'render',
        'screen': 'beauty_business_signup',
        'data': {
            'links': {k: v['screen'] for k, v in links.items() if v.get('screen')},
        },
        'meta': {'title': 'Beauty - Become a Provider'},
        '_links': links,
        'form': form,
    }
