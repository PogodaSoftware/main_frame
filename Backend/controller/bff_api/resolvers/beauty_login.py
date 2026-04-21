"""
Beauty Login Resolver
=====================
Returns the dynamic form schema for the customer login page.
If the user is already authenticated, redirects them home.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


_PRESENTATION = {
    'page_class': 'login-page',
    'main_class': 'login-main',
    'title_class': 'login-title',
    'subtitle_class': 'login-subtitle',
    'form_class': 'login-form',
    'submit_class': 'btn-login',
    'header_brand_icon': '✨',
    'header_brand_label': 'Beauty',
    'footer_label': "Don't have an account?",
}


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)

    if user is not None:
        return h.redirect_envelope('beauty_home', 'already_authenticated')

    links = {
        'self': h.self_link('beauty_login'),
        'home': h.screen_link('home', 'beauty_home', prompt='Beauty'),
    }
    if h.is_signup_enabled():
        links['signup'] = h.screen_link('signup', 'beauty_signup', prompt='Sign up')
    if h.is_business_login_enabled():
        links['business_login'] = h.screen_link(
            'business_login',
            'beauty_business_login',
            prompt='Business provider? Sign in here',
        )

    footer_links = []
    if h.is_signup_enabled():
        footer_links.append(h.footer_link(
            rel='signup',
            cta_class='link-btn link-signup',
            group_class='login-footer',
            label_prefix="Don't have an account?",
        ))
    if h.is_business_login_enabled():
        footer_links.append(h.footer_link(
            rel='business_login',
            cta_class='link-btn link-business',
            group_class='login-footer business-link',
            label_prefix=None,
        ))

    form = h.login_form(
        title='Welcome back',
        subtitle='Sign in to your account',
        submit_href='/api/beauty/login/',
        submit_prompt='Sign in',
        success_screen='beauty_home',
        presentation=_PRESENTATION,
        footer_links=footer_links,
    )

    return {
        'action': 'render',
        'screen': 'beauty_login',
        'data': {
            # Legacy field — kept for older clients / tests.
            'links': {k: v['screen'] for k, v in links.items() if v.get('screen')},
        },
        'meta': {'title': 'Beauty - Sign In'},
        '_links': links,
        'form': form,
    }
