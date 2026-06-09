"""
Beauty Admin Portal — Tag manager bottom-sheet resolver
"""

from beauty_api.middleware import SESSION_COOKIE_NAME
from django.db.models import Count

from beauty_api.models import BeautyAdminTag
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


_DEFAULT_SEEDS = [
    ('vip',        'VIP',          '#A06B2C', '#F4E7D6'),
    ('verified',   'Verified',     '#2F7A47', '#E5F3EA'),
    ('at-risk',    'At-risk',      '#C0392B', '#FCE8E5'),
    ('press',      'Press / PR',   '#0F1115', '#E9E9EB'),
    ('investor',   'Investor',     '#5C4A8A', '#ECE6F5'),
    ('featured',   'Featured',     '#7DA8CF', '#E6F0FA'),
    ('beta',       'Beta program', '#1F6E7A', '#DCEEF1'),
    ('win-back',   'Win-back',     '#8A6A1F', '#F1E8DA'),
    ('chargeback', 'Chargeback',   '#C0392B', '#FCE8E5'),
]


def _seed_defaults_if_empty() -> None:
    try:
        if BeautyAdminTag.objects.exists():
            return
        for slug, label, color, tone in _DEFAULT_SEEDS:
            BeautyAdminTag.objects.update_or_create(
                slug=slug, defaults={'label': label, 'color': color, 'tone': tone},
            )
    except Exception:
        pass


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    _seed_defaults_if_empty()

    tags = []
    try:
        for row in BeautyAdminTag.objects.all().annotate(
            count=Count('assignments'),
        ).order_by('-created_at'):
            tags.append({
                'id': row.slug,
                'label': row.label,
                'color': row.color,
                'tone': row.tone,
                'count': row.count,
            })
    except Exception:
        tags = []

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_tag_manager',
        'data': {
            'tags': tags,
            'session_remaining': h.session_remaining_label(cookie, device_id),
            'admin_initials': h.admin_initials(user),
        },
        'meta': {'title': 'Beauty — Manage tags'},
        '_links': {
            'self':   h.self_link('beauty_admin_portal_tag_manager'),
            'close': h.screen_link('close', 'beauty_admin_portal_dashboard', prompt='Done'),
            'crm':   h.screen_link('crm',   'beauty_admin_portal_crm',       prompt='Back to CRM'),
            'create': h.link(rel='create', href='/api/beauty/admin/portal/tags/', method='POST',
                             screen='beauty_admin_portal_tag_manager',
                             route=h.SCREEN_ROUTES['beauty_admin_portal_tag_manager']),
        },
    }
