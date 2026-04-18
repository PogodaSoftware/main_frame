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
    'submit_class': 'btn-login btn-business',
    'header_brand_icon': '🏢',
    'header_brand_label': 'Beauty',
    'header_badge_text': 'Business Portal',
    'header_badge_class': 'business-badge',
    'footer_label': 'Not a business provider?',
}


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    if not h.is_business_login_enabled():
        return h.redirect_envelope('beauty_login', 'feature_disabled')

    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)

    if user is not None:
        return h.redirect_envelope('beauty_home', 'already_authenticated')

    links = {
        'self': h.self_link('beauty_business_login'),
        'home': h.screen_link('home', 'beauty_home', prompt='Beauty'),
        'customer_login': h.screen_link(
            'customer_login', 'beauty_login', prompt='Customer sign in',
        ),
    }

    form = h.login_form(
        title='Business Sign In',
        subtitle='Access your business provider account',
        submit_href='/api/beauty/business/login/',
        submit_prompt='Sign in',
        success_screen='beauty_home',
        presentation=_PRESENTATION,
        footer_links=[
            h.footer_link(
                rel='customer_login',
                cta_class='link-btn link-signup',
                group_class='login-footer',
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
        'data': {
            'links': {k: v['screen'] for k, v in links.items() if v.get('screen')},
        },
        'meta': {'title': 'Beauty - Business Sign In'},
        '_links': links,
        'form': form,
    }
