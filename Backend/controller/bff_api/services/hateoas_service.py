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
    out: set[tuple[str, int]] = set()

    # Source 1: env var (BEAUTY_ADMIN_PRINCIPALS="customer:1,business:7")
    for part in os.environ.get('BEAUTY_ADMIN_PRINCIPALS', '').split(','):
        token = part.strip()
        if not token or ':' not in token:
            continue
        user_type, _, user_id_str = token.partition(':')
        user_type = user_type.strip().lower()
        if user_type not in _VALID_ADMIN_USER_TYPES:
            continue
        try:
            out.add((user_type, int(user_id_str.strip())))
        except (TypeError, ValueError):
            continue

    # Source 2: beauty_admin_principals DB table — inserted by tests and
    # operators without requiring a server restart.
    try:
        from beauty_api.models import BeautyAdminPrincipal
        for row in BeautyAdminPrincipal.objects.only('user_type', 'user_id'):
            if row.user_type in _VALID_ADMIN_USER_TYPES:
                out.add((row.user_type, row.user_id))
    except Exception:
        logger.warning(
            'Failed to read beauty_admin_principals from DB; relying on env var only.',
            exc_info=True,
        )

    return out


def is_beauty_admin(user: dict | None) -> bool:
    """
    Authorisation gate for the Beauty admin surface.

    A user is admin iff:
      - they're authenticated (i.e. user dict is non-None), AND
      - the (user_type, user_id) pair from their validated session is in
        the BEAUTY_ADMIN_PRINCIPALS allowlist.

    Email is deliberately not used — see `_admin_principal_allowlist`.

    Side effect: touches BeautyAdminPrincipal.last_active_at (throttled to
    once per 60 seconds) so the admin team page can show "Last active" for
    each principal without a separate heartbeat endpoint.
    """
    if not user:
        return False
    user_type = (user.get('user_type') or '').strip().lower()
    user_id = user.get('user_id')
    if user_type not in _VALID_ADMIN_USER_TYPES or not isinstance(user_id, int):
        return False
    if (user_type, user_id) not in _admin_principal_allowlist():
        return False
    _touch_principal_last_active(user_type, user_id)
    return True


def admin_flagged_count() -> int:
    """Accounts needing CRM review — business-cancelled bookings (refunds
    owed / accounts to follow up). Same signal the dashboard surfaces as
    'N flagged accounts need review'."""
    try:
        from beauty_api.models import BeautyBooking
        return BeautyBooking.objects.filter(
            status=BeautyBooking.STATUS_CANCELLED_BY_BUSINESS,
        ).count()
    except Exception:
        return 0


def admin_tab_badges() -> dict:
    """
    Real counts for the admin portal bottom tab bar.

    Returns a dict that components splat into <adm-tab-bar [badges]>. Keys
    map to tab IDs. Values are integers (rendered as a badge) or None
    (hide the badge). We intentionally avoid fabricating signals — keys
    we don't have a real source for resolve to None.
    """
    try:
        from beauty_api.models import BeautyAdminTicket
        open_tickets = BeautyAdminTicket.objects.exclude(
            status=BeautyAdminTicket.STATUS_RESOLVED,
        ).count()
    except Exception:
        open_tickets = None
    # CRM badge = accounts needing review (flagged). None when zero so the
    # badge hides rather than rendering "0".
    flagged = admin_flagged_count()
    return {
        'home':     None,
        'crm':      flagged or None,
        'bookings': None,
        'tickets':  open_tickets or None,
        'team':     None,
    }


def admin_notif_count() -> int | None:
    """
    Header bell badge — count of admin attention items across the portal:
    SLA-breached open tickets + flagged accounts needing review. Returns
    None when there are zero so the badge hides instead of showing "0".
    """
    n = (admin_ticket_signals().get('sla_breach') or 0) + admin_flagged_count()
    return n if n else None


def admin_ticket_signals() -> dict:
    """Real ticket signals for dashboard quick-link copy: open + SLA breach."""
    try:
        from datetime import datetime, timezone
        from beauty_api.models import BeautyAdminTicket
        base = BeautyAdminTicket.objects.exclude(status=BeautyAdminTicket.STATUS_RESOLVED)
        return {
            'open': base.count(),
            'sla_breach': base.filter(sla_breach_at__lte=datetime.now(timezone.utc)).count(),
        }
    except Exception:
        return {'open': 0, 'sla_breach': 0}


def _touch_principal_last_active(user_type: str, user_id: int) -> None:
    """Throttled UPDATE on BeautyAdminPrincipal.last_active_at."""
    try:
        from datetime import datetime, timedelta, timezone
        from django.db.models import Q
        from beauty_api.models import BeautyAdminPrincipal
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=60)
        BeautyAdminPrincipal.objects.filter(
            user_type=user_type, user_id=user_id,
        ).filter(Q(last_active_at__isnull=True) | Q(last_active_at__lt=cutoff)).update(
            last_active_at=now,
        )
    except Exception:
        logger.debug('Failed to touch admin last_active_at', exc_info=True)


def session_remaining_label(cookie_value: str | None, device_id: str | None) -> str:
    """Return ``MM:SS`` (or ``HH:MM:SS`` for >1h) of remaining session lifetime.

    Sourced from ``BeautySession.expires_at`` for the active token. Empty
    string when no active session is found.
    """
    if not cookie_value or not device_id:
        return ''
    try:
        import hashlib
        from datetime import datetime, timezone
        from beauty_api.models import BeautySession
        token_hash = hashlib.sha256(cookie_value.encode()).hexdigest()
        sess = BeautySession.objects.filter(
            token_hash=token_hash,
            device_id=device_id,
            is_active=True,
        ).order_by('-expires_at').first()
        if not sess:
            return ''
        secs = int((sess.expires_at - datetime.now(timezone.utc)).total_seconds())
        if secs <= 0:
            return '00:00'
        h, rem = divmod(secs, 3600)
        m, s = divmod(rem, 60)
        if h:
            return f'{h:02d}:{m:02d}:{s:02d}'
        return f'{m:02d}:{s:02d}'
    except Exception:
        return ''


def admin_initials(user: dict | None) -> str:
    """Two-letter initials from a user dict, falling back to ``AD``."""
    if not user:
        return 'AD'
    email = (user.get('email') or '').strip()
    if not email:
        return 'AD'
    local = email.split('@', 1)[0]
    parts = [p for p in local.replace('.', ' ').replace('_', ' ').replace('-', ' ').split() if p]
    if not parts:
        return local[:2].upper() or 'AD'
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[1][0]).upper()


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
    'beauty_welcome': '/pogoda/beauty/welcome',
    'beauty_forgot': '/pogoda/beauty/forgot',
    'beauty_business_login': '/pogoda/beauty/business/login',
    'beauty_business_signup': '/pogoda/beauty/business/signup',
    'beauty_business_application_entity':   '/pogoda/beauty/business/apply/entity',
    'beauty_business_application_services': '/pogoda/beauty/business/apply/services',
    'beauty_business_application_stripe':   '/pogoda/beauty/business/apply/stripe',
    'beauty_business_application_schedule': '/pogoda/beauty/business/apply/schedule',
    'beauty_business_application_tools':    '/pogoda/beauty/business/apply/tools',
    'beauty_business_application_review':   '/pogoda/beauty/business/apply/review',
    'beauty_wireframe': '/pogoda/beauty/wireframe',
    'beauty_users': '/pogoda/beauty/admin/users',
    'beauty_business_providers': '/pogoda/beauty/admin/business-providers',
    'beauty_sessions': '/pogoda/beauty/admin/sessions',
    'beauty_admin_flags': '/pogoda/beauty/admin/flags',
    # Admin Portal (slate redesign — handoff May 2026). All routes mobile-only.
    'beauty_admin_portal_signin':      '/pogoda/beauty/admin/portal/signin',
    'beauty_admin_portal_2fa':         '/pogoda/beauty/admin/portal/2fa',
    'beauty_admin_portal_magic':       '/pogoda/beauty/admin/portal/magic',
    'beauty_admin_portal_ip_warning':  '/pogoda/beauty/admin/portal/ip-warning',
    'beauty_admin_portal_dashboard':   '/pogoda/beauty/admin/portal/dashboard',
    'beauty_admin_portal_dashboard_v2':'/pogoda/beauty/admin/portal/dashboard/v2',
    'beauty_admin_portal_crm':         '/pogoda/beauty/admin/portal/crm',
    'beauty_admin_portal_tag_manager': '/pogoda/beauty/admin/portal/crm/tags',
    'beauty_admin_portal_suspend':     '/pogoda/beauty/admin/portal/crm/suspend/:type/:id',
    'beauty_admin_portal_customer_detail': '/pogoda/beauty/admin/portal/crm/customer/:id',
    'beauty_admin_portal_provider_detail': '/pogoda/beauty/admin/portal/crm/provider/:id',
    'beauty_admin_portal_bookings':    '/pogoda/beauty/admin/portal/bookings',
    'beauty_admin_portal_booking_detail': '/pogoda/beauty/admin/portal/bookings/:id',
    'beauty_admin_portal_tickets':     '/pogoda/beauty/admin/portal/tickets',
    'beauty_admin_portal_team':        '/pogoda/beauty/admin/portal/team',
    'beauty_admin_portal_audit':       '/pogoda/beauty/admin/portal/audit',
    # Customer marketplace screens. `:slug` / `:id` are substituted by the
    # Angular shell from BFF link `params`.
    'beauty_category': '/pogoda/beauty/category/:slug',
    'beauty_provider_detail': '/pogoda/beauty/providers/:id',
    'beauty_book': '/pogoda/beauty/book/:serviceId',
    'beauty_booking_success': '/pogoda/beauty/bookings/:bookingId/success',
    'beauty_booking_detail': '/pogoda/beauty/bookings/:id',
    'beauty_reschedule': '/pogoda/beauty/bookings/:bookingId/reschedule',
    'beauty_bookings': '/pogoda/beauty/bookings',
    'beauty_profile': '/pogoda/beauty/profile',
    'beauty_chats': '/pogoda/beauty/chats',
    'beauty_chat_thread': '/pogoda/beauty/chats/:bookingId',
    # Business portal screens.
    'beauty_business_home': '/pogoda/beauty/business',
    'beauty_business_messages': '/pogoda/beauty/business/messages',
    'beauty_business_notifications': '/pogoda/beauty/business/notifications',
    'beauty_business_services': '/pogoda/beauty/business/services',
    'beauty_business_service_form': '/pogoda/beauty/business/services/:serviceId/edit',
    'beauty_business_service_new': '/pogoda/beauty/business/services/new',
    'beauty_business_availability': '/pogoda/beauty/business/availability',
    'beauty_business_bookings': '/pogoda/beauty/business/bookings',
    'beauty_business_settings': '/pogoda/beauty/business/settings',
    'beauty_business_change_password': '/pogoda/beauty/business/settings/password',
    'beauty_business_email_contact': '/pogoda/beauty/business/settings/contact',
    'beauty_business_profile': '/pogoda/beauty/business/profile',
    'beauty_business_reviews': '/pogoda/beauty/business/reviews',
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


def redirect_envelope(
    target_screen: str,
    reason: str,
    *,
    params: dict | None = None,
) -> dict:
    """
    Standard redirect envelope. Includes both the new HATEOAS `_links.target`
    and the legacy `redirect_to` string for backward compatibility with the
    older client / Playwright suite.

    `params` is forwarded to the target/self screen links so route templates
    like `/bookings/:id` are rendered with concrete values.
    """
    target = screen_link('target', target_screen, params=params)
    return {
        'action': 'redirect',
        'redirect_to': target_screen,
        'reason': reason,
        '_links': {
            'self': screen_link('self', target_screen, params=params),
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


def name_field(*, label: str = 'Name', placeholder: str = 'What should we call you?') -> dict:
    return field(
        'name',
        type='text',
        label=label,
        placeholder=placeholder,
        required=False,
        autocomplete='given-name',
        autocapitalize='words',
    )


def forgot_form(
    *,
    title: str = 'Reset password',
    subtitle: str = (
        "Enter the email tied to your account. "
        "We'll send a link to reset your password."
    ),
    submit_href: str = '/api/beauty/auth/forgot/',
    submit_prompt: str = 'Send reset link',
    success_screen: str = 'beauty_login',
    presentation: dict | None = None,
    footer_links: list | None = None,
) -> dict:
    """Form schema for the customer Reset-Password screen."""
    return {
        'title': title,
        'subtitle': subtitle,
        'fields': [email_field(placeholder='you@example.com')],
        'submit': link(
            rel='submit',
            href=submit_href,
            method='POST',
            prompt=submit_prompt,
        ),
        'success': screen_link('success', success_screen),
        'presentation': presentation or {
            'page_class': 'forgot-page',
            'main_class': 'forgot-main',
            'title_class': 'forgot-title',
            'subtitle_class': 'forgot-subtitle',
            'form_class': 'forgot-form',
            'submit_class': 'btn-submit',
            'header_brand_icon': '✨',
            'header_brand_label': 'Beauty',
            'hide_top_header': True,
            'show_back_bar': True,
            'show_brand_block': True,
        },
        'footer_links': footer_links or [],
        # 404 = email not on file. Treated as silent success by the
        # legacy Angular client to avoid leaking enumeration; the RN
        # client mirrors that behavior. Surfacing 4xx here would defeat
        # the purpose, so map only 5xx to a generic error.
        'error_status_map': {500: 'Something went wrong. Please try again.'},
        'error_default': 'Something went wrong. Please try again.',
        'include_device_id': False,
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
    fields: list | None = None,
) -> dict:
    return {
        'title': title,
        'subtitle': subtitle,
        'fields': fields or [
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
