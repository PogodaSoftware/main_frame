"""
HATEOAS Service
===============
Builds hypermedia link objects and dynamic form schemas for BFF responses.

Every BFF resolver uses this service so links and form schemas are produced
in a single, consistent shape. The Angular shell follows whatever links
this service emits — no client-side routing tables, no client-side form
schemas. Reordering or removing a link/field here is an "over-the-air"
change (no app rebuild required).

Link object shape
-----------------
{
    "rel":    "signup",               # semantic relation name
    "href":   "/api/beauty/signup/",  # absolute path (None for nav-only links)
    "method": "POST" | "GET" | "DELETE" | "NAV",
    "screen": "beauty_signup",        # target screen for re-resolve (optional)
    "route":  "/pogoda/beauty/signup",# optional client route the shell pushes
    "prompt": "Sign up"               # human label
}

Form schema shape
-----------------
{
    "title":           "Welcome back",
    "subtitle":        "Sign in to your account",
    "fields":          [ ...field objects... ],
    "submit":          <link object>,
    "success":         <link object>,
    "presentation":    { ...css class hints for the renderer... },
    "error_status_map": { 401: "Invalid email or password." },
    "error_default":   "Something went wrong. Please try again."
}

Field object shape
------------------
{
    "name":          "email",
    "type":          "email" | "password" | "text",
    "label":         "Email",
    "placeholder":   "Enter your email",
    "required":      True,
    "min_length":    8,                 # optional
    "pattern":       "...regex...",     # optional
    "autocomplete":  "email",
    "inputmode":     "email",
    "autocapitalize": "none",
    "secret_toggle": False,             # show/hide password button
    "error_messages": {
        "required":   "Email is required.",
        "min_length": "Password must be at least 8 characters.",
        "email":      "Please enter a valid email address."
    }
}
"""

import os


# ---------------------------------------------------------------------------
# Feature flags — flipped here, never on the client.
# ---------------------------------------------------------------------------

def _flag(name: str, default: bool = True) -> bool:
    """Read a boolean feature flag from env. '0', 'false', 'off' disable."""
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() not in ('0', 'false', 'off', 'no', '')


def is_business_login_enabled() -> bool:
    return _flag('BEAUTY_BUSINESS_LOGIN_ENABLED', default=True)


def is_signup_enabled() -> bool:
    return _flag('BEAUTY_SIGNUP_ENABLED', default=True)


# ---------------------------------------------------------------------------
# Link builders
# ---------------------------------------------------------------------------

def link(
    rel: str,
    *,
    href: str | None = None,
    method: str = 'NAV',
    screen: str | None = None,
    route: str | None = None,
    prompt: str | None = None,
) -> dict:
    """Construct a single hypermedia link object."""
    return {
        'rel': rel,
        'href': href,
        'method': method,
        'screen': screen,
        'route': route,
        'prompt': prompt,
    }


# Canonical client routes — owned by the BFF so the shell never hard-codes them.
SCREEN_ROUTES = {
    'beauty_home': '/pogoda/beauty',
    'beauty_login': '/pogoda/beauty/login',
    'beauty_signup': '/pogoda/beauty/signup',
    'beauty_business_login': '/pogoda/beauty/business/login',
    'beauty_wireframe': '/pogoda/beauty/wireframe',
    'beauty_users': '/pogoda/beauty/admin/users',
    'beauty_business_providers': '/pogoda/beauty/admin/business-providers',
    'beauty_sessions': '/pogoda/beauty/admin/sessions',
}


def screen_link(rel: str, screen: str, prompt: str | None = None) -> dict:
    """Convenience: a navigation-only link to another BFF screen."""
    return link(
        rel=rel,
        method='NAV',
        screen=screen,
        route=SCREEN_ROUTES.get(screen),
        prompt=prompt,
    )


def self_link(screen: str) -> dict:
    return screen_link('self', screen)


def redirect_envelope(target_screen: str, reason: str) -> dict:
    """
    Standard redirect envelope. Includes both the new HATEOAS `_links.target`
    and the legacy `redirect_to` string for backward compatibility with the
    older client / Playwright suite.
    """
    target = screen_link('target', target_screen)
    return {
        'action': 'redirect',
        'redirect_to': target_screen,
        'reason': reason,
        '_links': {
            'self': screen_link('self', target_screen),
            'target': target,
        },
    }


# ---------------------------------------------------------------------------
# Form schema builders
# ---------------------------------------------------------------------------

def field(
    name: str,
    *,
    type: str = 'text',
    label: str,
    placeholder: str = '',
    required: bool = True,
    min_length: int | None = None,
    autocomplete: str | None = None,
    inputmode: str | None = None,
    autocapitalize: str | None = None,
    secret_toggle: bool = False,
    error_messages: dict | None = None,
) -> dict:
    return {
        'name': name,
        'type': type,
        'label': label,
        'placeholder': placeholder,
        'required': required,
        'min_length': min_length,
        'autocomplete': autocomplete,
        'inputmode': inputmode,
        'autocapitalize': autocapitalize,
        'secret_toggle': secret_toggle,
        'error_messages': error_messages or {},
    }


def email_field(*, label: str = 'Email', placeholder: str = 'Enter your email') -> dict:
    return field(
        'email',
        type='email',
        label=label,
        placeholder=placeholder,
        autocomplete='email',
        inputmode='email',
        autocapitalize='none',
        error_messages={
            'required': 'Email is required.',
            'email': 'Please enter a valid email address.',
        },
    )


def password_field(
    *,
    label: str = 'Password',
    placeholder: str = 'Enter your password',
    autocomplete: str = 'current-password',
    min_length: int | None = None,
) -> dict:
    msgs = {'required': 'Password is required.'}
    if min_length:
        msgs['min_length'] = f'Password must be at least {min_length} characters.'
    return field(
        'password',
        type='password',
        label=label,
        placeholder=placeholder,
        autocomplete=autocomplete,
        secret_toggle=True,
        min_length=min_length,
        error_messages=msgs,
    )


def footer_link(
    *,
    rel: str,
    cta_class: str,
    group_class: str = 'login-footer',
    label_prefix: str | None = None,
) -> dict:
    """
    Footer link descriptor used by the dynamic form renderer.

    `rel` references an entry in the response's top-level `_links` dict —
    if the link is absent (e.g. feature flag off), the renderer skips
    this footer item entirely.
    """
    return {
        'rel': rel,
        'cta_class': cta_class,
        'group_class': group_class,
        'label_prefix': label_prefix,
    }


def login_form(
    *,
    title: str,
    subtitle: str,
    submit_href: str,
    submit_prompt: str,
    success_screen: str,
    presentation: dict,
    footer_links: list | None = None,
    error_status_map: dict | None = None,
) -> dict:
    return {
        'title': title,
        'subtitle': subtitle,
        'fields': [email_field(), password_field()],
        'submit': link(
            rel='submit',
            href=submit_href,
            method='POST',
            prompt=submit_prompt,
        ),
        'success': screen_link('success', success_screen),
        'presentation': presentation,
        'footer_links': footer_links or [],
        'error_status_map': error_status_map or {401: 'Invalid email or password.'},
        'error_default': 'Something went wrong. Please try again.',
        'include_device_id': True,
    }


def signup_form(
    *,
    title: str,
    subtitle: str,
    submit_href: str,
    submit_prompt: str,
    success_screen: str,
    presentation: dict,
    footer_links: list | None = None,
) -> dict:
    return {
        'title': title,
        'subtitle': subtitle,
        'fields': [
            email_field(),
            password_field(
                placeholder='Create a password',
                autocomplete='new-password',
                min_length=8,
            ),
        ],
        'submit': link(
            rel='submit',
            href=submit_href,
            method='POST',
            prompt=submit_prompt,
        ),
        'success': screen_link('success', success_screen),
        'presentation': presentation,
        'footer_links': footer_links or [],
        'error_status_map': {},
        'error_default': 'Please check your details and try again.',
        'include_device_id': False,
    }
