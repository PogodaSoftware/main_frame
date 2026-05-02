"""Beauty Business Signup Resolver

Form schema for the *new* business signup page. On success the wizard
takes over: we point ``success`` at the first wizard step rather than
the business home, so a brand-new account never lands on the dashboard
with an empty application.
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
    'submit_class': 'btn-login btn-business',
    'header_brand_icon': '🏢',
    'header_brand_label': 'Beauty',
    'header_badge_text': 'Business Portal',
    'header_badge_class': 'business-badge',
    'show_field_labels': True,
    'hide_top_header': False,
    'show_back_bar': True,
    'show_brand_block': False,
    'show_terms_checkbox': False,
    'show_or_divider': False,
    'show_social': False,
}


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if user is not None:
        target = (
            'beauty_business_application_entity'
            if user.get('user_type') == 'business'
            else 'beauty_home'
        )
        return h.redirect_envelope(target, 'already_authenticated')

    business_name_field = h.field(
        'business_name',
        type='text',
        label='Business name',
        placeholder="Your storefront's name",
        required=True,
        autocomplete='organization',
        autocapitalize='words',
        error_messages={'required': 'Business name is required.'},
    )

    form = h.signup_form(
        title='Create business account',
        subtitle='Then walk through a 5-step application to unlock your portal.',
        submit_href='/api/beauty/business/signup/',
        submit_prompt='Create account',
        success_screen='beauty_business_application_entity',
        presentation=_PRESENTATION,
        fields=[
            business_name_field,
            h.email_field(label='Business email', placeholder='you@example.com'),
            h.password_field(
                placeholder='At least 8 characters',
                autocomplete='new-password',
                min_length=8,
            ),
        ],
        footer_links=[
            h.footer_link(
                rel='business_login',
                cta_class='link-btn link-business',
                group_class='signup-footer',
                label_prefix='Already have a business account?',
            ),
        ],
    )

    links = {
        'self': h.self_link('beauty_business_signup'),
        'home': h.screen_link('home', 'beauty_home', prompt='Beauty'),
        'back': h.screen_link('back', 'beauty_business_login', prompt='Back'),
        'business_login': h.screen_link(
            'business_login', 'beauty_business_login', prompt='Sign in',
        ),
    }
    return {
        'action': 'render',
        'screen': 'beauty_business_signup',
        'data': {},
        'meta': {'title': 'Beauty - Business Sign Up'},
        '_links': links,
        'form': form,
    }
