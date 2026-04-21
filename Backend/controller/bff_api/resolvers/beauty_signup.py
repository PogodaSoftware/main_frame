"""
Beauty Signup Resolver
======================
Returns the dynamic form schema for the customer sign-up page.
If the user is already authenticated, redirects them home.
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


_PRESENTATION = {
    'page_class': 'signup-page',
    'main_class': 'signup-main',
    'title_class': 'signup-title',
    'subtitle_class': 'signup-subtitle',
    'form_class': 'signup-form',
    'submit_class': 'btn-continue',
    'header_brand_icon': '✨',
    'header_brand_label': 'Beauty',
    'footer_label': 'Already have an account?',
    'footer_class': 'signup-footer',
    # Signup originally had no per-field labels; suppress label rendering.
    'show_field_labels': False,
}


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)

    if user is not None:
        return h.redirect_envelope('beauty_home', 'already_authenticated')

    links = {
        'self': h.self_link('beauty_signup'),
        'home': h.screen_link('home', 'beauty_home', prompt='Beauty'),
        'login': h.screen_link('login', 'beauty_login', prompt='Sign in'),
    }

    form = h.signup_form(
        title="What's your email?",
        subtitle='',
        submit_href='/api/beauty/signup/',
        submit_prompt='Continue',
        success_screen='beauty_home',
        presentation=_PRESENTATION,
        footer_links=[
            h.footer_link(
                rel='login',
                cta_class='link-btn',
                group_class='signup-footer',
                label_prefix='Already have an account?',
            ),
        ],
    )

    return {
        'action': 'render',
        'screen': 'beauty_signup',
        'data': {
            'links': {k: v['screen'] for k, v in links.items() if v.get('screen')},
        },
        'meta': {'title': 'Beauty - Sign Up'},
        '_links': links,
        'form': form,
    }
