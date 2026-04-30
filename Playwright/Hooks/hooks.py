import os
from playwright.sync_api import Page

frontend_port = os.getenv('FRONTEND_PORT', '4200')


_BEAUTY_BASE = "/pogoda/beauty"


# Static and templated routes for selecting_different_routes / goto_route.
# Templated routes use string-format placeholders matching keyword args in
# goto_route (e.g. `{slug}`).
_ROUTE_PATHS = {
    'kevin': '/kevin',
    'pogoda': '/pogoda',
    'beauty_home': f'{_BEAUTY_BASE}',
    'beauty_login': f'{_BEAUTY_BASE}/login',
    'beauty_signup': f'{_BEAUTY_BASE}/signup',
    'beauty_business_login': f'{_BEAUTY_BASE}/business/login',
    'beauty_welcome': f'{_BEAUTY_BASE}/welcome',
    'beauty_forgot': f'{_BEAUTY_BASE}/forgot',
    'beauty_error': f'{_BEAUTY_BASE}/error',
    'beauty_404': f'{_BEAUTY_BASE}/not-found',
    'beauty_offline': f'{_BEAUTY_BASE}/offline',
    'beauty_catchall': f'{_BEAUTY_BASE}/foobar',
    'beauty_category': f'{_BEAUTY_BASE}/category/{{slug}}',
    'beauty_provider': f'{_BEAUTY_BASE}/providers/{{id}}',
    'beauty_book': f'{_BEAUTY_BASE}/book/{{serviceId}}',
    'beauty_bookings': f'{_BEAUTY_BASE}/bookings',
    'beauty_booking_detail': f'{_BEAUTY_BASE}/bookings/{{id}}',
    'beauty_booking_success': f'{_BEAUTY_BASE}/bookings/{{id}}/success',
    'beauty_profile': f'{_BEAUTY_BASE}/profile',
}


def _build_url(route: str, **params) -> str:
    if route not in _ROUTE_PATHS:
        raise ValueError(f"Unknown route: {route}")
    path = _ROUTE_PATHS[route]
    if params:
        path = path.format(**params)
    return f"http://localhost:{frontend_port}{path}"


def goto_route(page: Page, route: str, **params) -> str:
    """
    Navigate `page` to the named route. Accepts keyword params for templated
    routes (e.g. `goto_route(page, 'beauty_category', slug='facial')`).
    Returns the final URL navigated to.
    """
    url = _build_url(route, **params)
    page.goto(url)
    return url


def selecting_different_routes(page: Page, route: str, *args, **params):
    """
    Backward-compatible router. Existing call sites passed only a route key
    for static routes. Templated routes accept a single positional `arg` (used
    as the obvious param) or explicit kwargs.
    """
    if args and not params:
        # Heuristic: the only path param required by templated routes is one
        # of {slug, id, serviceId}. Pick the first placeholder name from the
        # template if present.
        path = _ROUTE_PATHS.get(route, '')
        for placeholder in ('slug', 'serviceId', 'id'):
            if '{' + placeholder + '}' in path:
                params = {placeholder: args[0]}
                break
    page.goto(_build_url(route, **params))


def timeout_for_testing(page: Page):
    page.wait_for_timeout(3000)
