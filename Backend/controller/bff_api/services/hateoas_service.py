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

import logging
import os


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Feature flags — flipped here, never on the client.
# ---------------------------------------------------------------------------
#
# The runtime source of truth is the `beauty_feature_flags` table, edited
# from the admin panel at /pogoda/beauty/admin/flags. Each resolve consults
# the DB so toggles take effect on the next BFF call (no redeploy).
#
# If the DB row is missing (e.g. fresh environment, migration not yet run)
# we transparently fall back to the legacy environment-variable default so
# existing deployments keep working.

# Registry of all known flags. The admin screen iterates this list, so every
# new flag must be declared here with its env-var default and a description.
FEATURE_FLAGS: list[dict] = [
    {
        'key': 'BEAUTY_BUSINESS_LOGIN_ENABLED',
        'label': 'Business sign-in entry point',
        'description': 'Show the "Business sign in" link on the home and customer login screens.',
        'default': True,
    },
    {
        'key': 'BEAUTY_SIGNUP_ENABLED',
        'label': 'Customer sign-up',
        'description': 'Allow new customer accounts to be created.',
        'default': True,
    },
]

FEATURE_FLAG_KEYS: frozenset = frozenset(f['key'] for f in FEATURE_FLAGS)


def _env_flag(name: str, default: bool = True) -> bool:
    """Read a boolean feature flag from env. '0', 'false', 'off' disable."""
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() not in ('0', 'false', 'off', 'no', '')


def _flag(name: str, default: bool = True) -> bool:
    """
    DB-first flag lookup with env-var fallback.

    Imported lazily so this module stays importable in contexts where Django
    isn't fully booted (e.g. management commands, isolated unit tests).
    """
    try:
        from beauty_api.models import BeautyFeatureFlag
    except Exception:
        return _env_flag(name, default)

    try:
        row = BeautyFeatureFlag.objects.only('enabled').filter(key=name).first()
    except Exception:
        # DB unavailable / migration not yet applied — degrade gracefully.
        logger.exception('Failed to read feature flag %s from DB; falling back to env.', name)
        return _env_flag(name, default)

    if row is None:
        return _env_flag(name, default)
    return bool(row.enabled)


_VALID_ADMIN_USER_TYPES = {'customer', 'business'}


def _admin_principal_allowlist() -> set[tuple[str, int]]:
    """
    Parse the BEAUTY_ADMIN_PRINCIPALS env var into a set of
    (user_type, user_id) tuples.

    Format: comma-separated `<user_type>:<user_id>` pairs, e.g.
        BEAUTY_ADMIN_PRINCIPALS="customer:1,business:7"

    We intentionally bind to (user_type, user_id) — the stable
    primary-key identity of the authenticated principal — instead of
    email. Email is not a safe authorisation key in this codebase
    because `BeautyUser` and `BusinessProvider` are separate tables
    with no cross-table uniqueness constraint, so the same email
    string can identify two different principals.

    An empty/missing value means no one is authorised — the admin
    surface is locked down by default.
    """
    raw = os.environ.get('BEAUTY_ADMIN_PRINCIPALS', '')
    out: set[tuple[str, int]] = set()
    for part in raw.split(','):
        token = part.strip()
        if not token or ':' not in token:
            continue
        user_type, _, user_id_str = token.partition(':')
        user_type = user_type.strip().lower()
        if user_type not in _VALID_ADMIN_USER_TYPES:
            continue
        try:
            user_id = int(user_id_str.strip())
        except (TypeError, ValueError):
            continue
        out.add((user_type, user_id))
    return out


def is_beauty_admin(user: dict | None) -> bool:
    """
    Authorisation gate for the Beauty admin surface.

    A user is admin iff:
      - they're authenticated (i.e. user dict is non-None), AND
      - the (user_type, user_id) pair from their validated session is in
        the BEAUTY_ADMIN_PRINCIPALS allowlist.

    Email is deliberately not used — see `_admin_principal_allowlist`.
    """
    if not user:
        return False
    user_type = (user.get('user_type') or '').strip().lower()
    user_id = user.get('user_id')
    if user_type not in _VALID_ADMIN_USER_TYPES or not isinstance(user_id, int):
        return False
    return (user_type, user_id) in _admin_principal_allowlist()


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
    params: dict | None = None,
) -> dict:
    """Construct a single hypermedia link object.

    `params` carries route parameters (e.g. `{'serviceId': 7}`). When `route`
    contains `:name` placeholders, they are substituted here so the resulting
    link is directly navigable by the shell.
    """
    resolved_route = route
    if resolved_route and params:
        for key, value in params.items():
            resolved_route = resolved_route.replace(f':{key}', str(value))
    return {
        'rel': rel,
        'href': href,
        'method': method,
        'screen': screen,
        'route': resolved_route,
        'prompt': prompt,
        'params': params or None,
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
    'beauty_admin_flags': '/pogoda/beauty/admin/flags',
    # Customer marketplace screens. `:slug` / `:id` are substituted by the
    # Angular shell from BFF link `params`.
    'beauty_category': '/pogoda/beauty/category/:slug',
    'beauty_provider_detail': '/pogoda/beauty/providers/:id',
    'beauty_book': '/pogoda/beauty/book/:serviceId',
    'beauty_bookings': '/pogoda/beauty/bookings',
    'beauty_profile': '/pogoda/beauty/profile',
}


def screen_link(
    rel: str,
    screen: str,
    prompt: str | None = None,
    params: dict | None = None,
) -> dict:
    """Convenience: a navigation-only link to another BFF screen."""
    return link(
        rel=rel,
        method='NAV',
        screen=screen,
        route=SCREEN_ROUTES.get(screen),
        prompt=prompt,
        params=params,
    )


def self_link(screen: str, params: dict | None = None) -> dict:
    return screen_link('self', screen, params=params)


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
    pattern: str | None = None,
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
        'pattern': pattern,
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
