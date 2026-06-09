"""Beauty Admin Portal — Notifications dropdown resolver.

Lazy-fetched when the header bell is tapped. Assembles a real-data
notification feed (no fabricated signals):

  - flagged accounts needing review  (business-cancelled bookings)
  - pending provider applications     (BusinessProviderApplication submitted)
  - open support tickets              (BeautyAdminTicket not resolved)

`unread` = items with an `unread` flag (flagged accounts, pending apps,
SLA-breached tickets). Footer "View all activity" → audit log.
"""

from datetime import datetime, timezone

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import (
    BeautyAdminTicket, BeautyBooking, BeautyUser, BusinessProviderApplication,
)
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


def _age(dt) -> str:
    if not dt:
        return ''
    s = int((datetime.now(timezone.utc) - dt).total_seconds())
    if s < 60:
        return 'now'
    if s < 3600:
        return f'{s // 60}m'
    if s < 86400:
        return f'{s // 3600}h'
    return f'{s // 86400}d'


def _group(dt, now) -> str:
    """Sticky section label for the full-screen feed."""
    if not dt:
        return 'Earlier'
    days = (now.date() - dt.date()).days
    if days <= 0:
        return 'Today'
    if days == 1:
        return 'Yesterday'
    if days <= 7:
        return 'Earlier this week'
    return 'Earlier'


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    now = datetime.now(timezone.utc)
    # Each entry: (dt_for_sort_and_group, item_dict_without_group)
    staged: list[tuple] = []

    # ── Flagged accounts (business-cancelled bookings → refunds owed / review) ──
    try:
        flagged = BeautyBooking.objects.filter(
            status=BeautyBooking.STATUS_CANCELLED_BY_BUSINESS,
        ).count()
    except Exception:
        flagged = 0
    if flagged:
        staged.append((now, {
            'kind': 'flag',
            'title': f"{flagged} account{'s' if flagged != 1 else ''} flagged for review",
            'sub': 'Trust & Safety · auto-detection',
            'time': 'now',
            'unread': True,
            'screen': 'beauty_admin_portal_crm',
        }))

    # ── Pending provider applications (awaiting approval) ──
    try:
        pending_apps = list(
            BusinessProviderApplication.objects
            .filter(status=BusinessProviderApplication.STATUS_SUBMITTED)
            .order_by('-submitted_at')[:5]
        )
    except Exception:
        pending_apps = []
    for app in pending_apps:
        name = (app.business_name
                or f'{app.applicant_first_name} {app.applicant_last_name}'.strip()
                or 'New provider')
        staged.append((app.submitted_at or now, {
            'kind': 'provider',
            'title': f'Provider "{name}" applied',
            'sub': 'Onboarding · awaiting approval',
            'time': _age(app.submitted_at),
            'unread': True,
            'screen': 'beauty_admin_portal_crm',
        }))

    # ── New customer signups in the last 7 days (growth) ──
    try:
        from datetime import timedelta
        signups_7d = BeautyUser.objects.filter(created_at__gte=now - timedelta(days=7)).count()
        latest_signup = BeautyUser.objects.order_by('-created_at').values_list('created_at', flat=True).first()
    except Exception:
        signups_7d, latest_signup = 0, None
    if signups_7d:
        staged.append((latest_signup or now, {
            'kind': 'provider',
            'title': f"{signups_7d} new customer{'s' if signups_7d != 1 else ''} signed up",
            'sub': 'Growth · last 7 days',
            'time': _age(latest_signup),
            'unread': False,
            'screen': 'beauty_admin_portal_crm',
        }))

    # ── Open support tickets ──
    try:
        open_tickets = list(
            BeautyAdminTicket.objects
            .exclude(status=BeautyAdminTicket.STATUS_RESOLVED)
            .order_by('-created_at')[:6]
        )
    except Exception:
        open_tickets = []
    for t in open_tickets:
        breached = bool(t.sla_breach_at and t.sla_breach_at <= now)
        subject = (t.subject or '').strip()
        title = f'Ticket #{t.id}' + (f' · {subject}' if subject else '')
        staged.append((t.created_at or now, {
            'kind': 'ticket',
            'title': title[:60],
            'sub': f'{t.category} · priority {t.priority}',
            'time': _age(t.created_at),
            'unread': breached,
            'screen': 'beauty_admin_portal_tickets',
        }))

    # Newest first, then tag each with its sticky group label.
    staged.sort(key=lambda s: s[0], reverse=True)
    items: list[dict] = []
    for dt, it in staged:
        it = {**it, 'group': _group(dt, now)}
        items.append(it)

    unread = sum(1 for i in items if i.get('unread'))

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_notifications',
        'data': {
            'notifications': items,
            'unread': unread,
            'total': len(items),
            'tab_badges': h.admin_tab_badges(),
            'notif_count': h.admin_notif_count(),
            'session_remaining': h.session_remaining_label(cookie, device_id),
            'admin_initials': h.admin_initials(user),
        },
        'meta': {'title': 'Notifications'},
        '_links': {
            'self': h.self_link('beauty_admin_portal_notifications'),
            'view_all': h.screen_link('view_all', 'beauty_admin_portal_audit', prompt='View all activity'),
            'crm': h.screen_link('crm', 'beauty_admin_portal_crm', prompt='CRM'),
            'tickets': h.screen_link('tickets', 'beauty_admin_portal_tickets', prompt='Tickets'),
        },
    }
