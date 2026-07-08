"""
Beauty Business Login Resolver
===============================
Returns the dynamic form schema for the business provider login page.
If the user is already authenticated, redirects them home.
If the business_login feature flag is off, redirects to the customer login.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


_PRESENTATION = {
    'page_class': 'login-page business-login-page',
    'main_class': 'login-main',
    'title_class': 'login-title',
    'subtitle_class': 'login-subtitle',
    'form_class': 'login-form',
    'submit_class': 'btn-login',
    'header_brand_icon': '✨',
    'header_brand_label': 'Beauty',
    'footer_label': 'Not a business provider?',
    # Design-system visual flags consumed by BeautyDynamicFormComponent.
    'hide_top_header': True,
    'show_back_bar': True,
    'show_brand_block': True,
    'brand_block_badge': 'Business Portal',
    'show_forgot_link': True,
    'show_or_divider': True,
    'show_social': True,
    'social_button_label': 'Continue with Google',
}


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    if not h.is_business_login_enabled():
        return h.redirect_envelope('beauty_login', 'feature_disabled')

    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)

    if user is not None:
        # Already-signed-in business users go straight to their portal.
        target = (
            'beauty_business_home'
            if user.get('user_type') == 'business'
            else 'beauty_home'
        )
        return h.redirect_envelope(target, 'already_authenticated')

    links = {
        'self': h.self_link('beauty_business_login'),
        'home': h.screen_link('home', 'beauty_home', prompt='Beauty'),
        'back': h.screen_link('back', 'beauty_welcome', prompt='Back'),
        'forgot': h.screen_link('forgot', 'beauty_forgot', prompt='Forgot password?'),
        'customer_login': h.screen_link(
            'customer_login', 'beauty_login', prompt='Customer sign in',
        ),
        'business_signup': h.screen_link(
            'business_signup', 'beauty_business_signup', prompt='Sign up',
        ),
        'google': h.screen_link(
            'google', 'beauty_google_auth',
            prompt='Continue with Google', params={'user_type': 'business'},
        ),
    }

    form = h.login_form(
        title='Business Sign In',
        subtitle='Access your business provider account',
        submit_href='/api/beauty/business/login/',
        submit_prompt='Sign in',
        success_screen='beauty_business_home',
        presentation=_PRESENTATION,
        footer_links=[
            h.footer_link(
                rel='business_signup',
                cta_class='link-btn link-signup',
                group_class='login-footer',
                label_prefix="Don't have an account?",
            ),
            h.footer_link(
                rel='customer_login',
                cta_class='link-btn link-business',
                group_class='login-footer business-link',
                label_prefix='Not a business provider?',
            ),
        ],
    )
    # Business email field gets a slightly different placeholder/label.
    form['fields'][0]['label'] = 'Business Email'
    form['fields'][0]['placeholder'] = 'Enter your business email'

    return {
        'action': 'render',
        'screen': 'beauty_business_login',
        'data': {},
        'meta': {'title': 'Beauty - Business Sign In'},
        '_links': links,
        'form': form,
    }
