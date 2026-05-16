"""
Beauty Admin Portal — Support tickets resolver
"""

from datetime import datetime, timezone

from django.db.models import Q

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import BeautyAdminTicket
from ..services.auth_service import get_authenticated_user
from ..services import hateoas_service as h


_CATEGORY_RUBRIC = [
    {'id': 'all',     'label': 'All',     'color': '#0F1115'},
    {'id': 'refund',  'label': 'Refund',  'color': '#C0392B'},
    {'id': 'no-show', 'label': 'No-show', 'color': '#C0392B'},
    {'id': 'payment', 'label': 'Payment', 'color': '#7A5A1F'},
    {'id': 'payouts', 'label': 'Payouts', 'color': '#7A5A1F'},
    {'id': 'account', 'label': 'Account', 'color': '#1F6E7A'},
    {'id': 'fraud',   'label': 'Fraud',   'color': '#C0392B'},
    {'id': 'booking', 'label': 'Booking', 'color': '#7DA8CF'},
]


def _humanize_age(dt) -> str:
    if not dt:
        return '—'
    s = int((datetime.now(timezone.utc) - dt).total_seconds())
    if s < 60:
        return f'{s}s'
    if s < 3600:
        return f'{s // 60}m'
    if s < 86400:
        return f'{s // 3600}h'
    return f'{s // 86400}d'


def _ticket_row(t: BeautyAdminTicket) -> dict:
    sla_state = 'on-track'
    if t.sla_breach_at and datetime.now(timezone.utc) >= t.sla_breach_at:
        sla_state = 'breached'
    return {
        'id': t.id,
        'priority': t.priority,                       # 'high' | 'med' | 'low'
        'priority_label': t.get_priority_display(),
        'category': t.category,
        'category_label': t.get_category_display(),
        'status': t.status,
        'status_label': t.get_status_display(),
        'source': t.source,
        'source_label': t.get_source_display(),
        'subject': t.subject,
        'from_principal_type': t.from_principal_type,
        'from_principal_id': t.from_principal_id,
        'from_label': t.from_label,
        'assignee_email': t.assignee_email,
        'age': _humanize_age(t.created_at),
        'sla': sla_state,
    }


def resolve(request, screen: str, device_id: str, params: dict | None = None) -> dict:
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if not user or not h.is_beauty_admin(user):
        return h.redirect_envelope('beauty_admin_portal_signin', 'auth_required')

    qparams = dict(params or {})
    cat = (qparams.get('cat') or 'all').lower()
    statuses = (qparams.get('status') or 'open').lower()
    src = (qparams.get('src') or '').lower()
    q = (qparams.get('q') or '').strip()
    sort = (qparams.get('sort') or 'sla').lower()

    qs = BeautyAdminTicket.objects.all()
    if cat != 'all':
        qs = qs.filter(category=cat)
    if statuses == 'open':
        qs = qs.exclude(status=BeautyAdminTicket.STATUS_RESOLVED)
    elif statuses == 'resolved':
        qs = qs.filter(status=BeautyAdminTicket.STATUS_RESOLVED)
    elif statuses == 'mine':
        qs = qs.filter(assignee_email__iexact=(user.get('email') or '')).exclude(status=BeautyAdminTicket.STATUS_RESOLVED)
    elif statuses == 'unassigned':
        qs = qs.filter(assignee_email='').exclude(status=BeautyAdminTicket.STATUS_RESOLVED)
    elif statuses == 'sla':
        qs = qs.filter(sla_breach_at__lte=datetime.now(timezone.utc)).exclude(status=BeautyAdminTicket.STATUS_RESOLVED)
    elif statuses == 'waiting':
        qs = qs.filter(status=BeautyAdminTicket.STATUS_WAITING)

    if src in (BeautyAdminTicket.SOURCE_IN_APP, BeautyAdminTicket.SOURCE_EMAIL, BeautyAdminTicket.SOURCE_SYSTEM):
        qs = qs.filter(source=src)

    if q:
        try:
            q_int = int(q)
        except ValueError:
            q_int = None
        f = Q(subject__icontains=q) | Q(from_label__icontains=q) | Q(assignee_email__icontains=q)
        if q_int is not None:
            f = f | Q(id=q_int)
        qs = qs.filter(f)

    from django.db.models import Case, IntegerField, Value, When
    priority_rank = Case(
        When(priority=BeautyAdminTicket.PRIORITY_HIGH, then=Value(0)),
        When(priority=BeautyAdminTicket.PRIORITY_MED,  then=Value(1)),
        When(priority=BeautyAdminTicket.PRIORITY_LOW,  then=Value(2)),
        default=Value(3),
        output_field=IntegerField(),
    )
    status_rank = Case(
        When(status=BeautyAdminTicket.STATUS_NEW,         then=Value(0)),
        When(status=BeautyAdminTicket.STATUS_IN_PROGRESS, then=Value(1)),
        When(status=BeautyAdminTicket.STATUS_WAITING,     then=Value(2)),
        When(status=BeautyAdminTicket.STATUS_RESOLVED,    then=Value(3)),
        default=Value(4),
        output_field=IntegerField(),
    )
    qs = qs.annotate(_pr=priority_rank, _sr=status_rank)
    sort_clauses = {
        'sla':        ('-sla_breach_at', '_pr', '-created_at'),
        'priority':   ('_pr', '-created_at'),
        'newest':     ('-created_at',),
        'oldest':     ('created_at',),
        'status':     ('_sr', '-created_at'),
        'assignee':   ('assignee_email', '-created_at'),
        'updated':    ('-updated_at',),
    }
    qs = qs.order_by(*sort_clauses.get(sort, sort_clauses['sla']))[:50]
    rows = [_ticket_row(t) for t in qs]

    # Bucket counts (always over the full table, status open).
    base_open = BeautyAdminTicket.objects.exclude(status=BeautyAdminTicket.STATUS_RESOLVED)
    cats_with_counts = []
    for spec in _CATEGORY_RUBRIC:
        if spec['id'] == 'all':
            cnt = base_open.count()
        else:
            cnt = base_open.filter(category=spec['id']).count()
        cats_with_counts.append({**spec, 'count': cnt})

    open_count = base_open.count()
    mine_count = base_open.filter(assignee_email__iexact=(user.get('email') or '')).count()
    unassigned_count = base_open.filter(assignee_email='').count()
    sla_count = base_open.filter(sla_breach_at__lte=datetime.now(timezone.utc)).count()
    waiting_count = BeautyAdminTicket.objects.filter(status=BeautyAdminTicket.STATUS_WAITING).count()
    resolved_count_7d = BeautyAdminTicket.objects.filter(
        status=BeautyAdminTicket.STATUS_RESOLVED,
        updated_at__gte=datetime.now(timezone.utc) - __import__('datetime').timedelta(days=7),
    ).count()

    status_buckets = [
        {'id': 'open',       'label': 'All open',       'count': open_count},
        {'id': 'mine',       'label': 'Assigned to me', 'count': mine_count},
        {'id': 'sla',        'label': 'SLA breaches',   'count': sla_count},
        {'id': 'unassigned', 'label': 'Unassigned',     'count': unassigned_count},
        {'id': 'waiting',    'label': 'Waiting on user','count': waiting_count},
        {'id': 'resolved',   'label': 'Resolved · 7d',  'count': resolved_count_7d},
    ]

    return {
        'action': 'render',
        'screen': 'beauty_admin_portal_tickets',
        'data': {
            'rows': rows,
            'category_rubric': cats_with_counts,
            'active_category': cat,
            'status_buckets': status_buckets,
            'active_status': statuses,
            'active_source': src,
            'q': q,
            'open_count': open_count,
            'sla_count': sla_count,
            'admin_email': user.get('email') or '',
            'sort': sort,
            'tab_badges': h.admin_tab_badges(),
            'notif_count': h.admin_notif_count(),
            'sort_options': [
                {'value': 'sla',      'label': 'SLA · age'},
                {'value': 'priority', 'label': 'Priority (high → low)'},
                {'value': 'status',   'label': 'Status'},
                {'value': 'newest',   'label': 'Newest first'},
                {'value': 'oldest',   'label': 'Oldest first'},
                {'value': 'updated',  'label': 'Recently updated'},
                {'value': 'assignee', 'label': 'Assignee A → Z'},
            ],
        },
        'meta': {'title': 'Beauty — Support tickets'},
        '_links': {
            'self': h.self_link('beauty_admin_portal_tickets'),
            'home':     h.screen_link('home',     'beauty_admin_portal_dashboard'),
            'crm':      h.screen_link('crm',      'beauty_admin_portal_crm'),
            'bookings': h.screen_link('bookings', 'beauty_admin_portal_bookings'),
            'team':     h.screen_link('team',     'beauty_admin_portal_team'),
            'create': h.link(
                rel='create', href='/api/beauty/admin/portal/tickets/', method='POST',
                screen='beauty_admin_portal_tickets',
                route=h.SCREEN_ROUTES['beauty_admin_portal_tickets'],
                prompt='New ticket',
            ),
            # Action templates: the component substitutes :id at click time.
            'assign_template': h.link(
                rel='assign', href='/api/beauty/admin/portal/tickets/:id/assign/', method='POST',
                screen='beauty_admin_portal_tickets',
                route=h.SCREEN_ROUTES['beauty_admin_portal_tickets'],
                prompt='Assign',
            ),
            'status_template': h.link(
                rel='status', href='/api/beauty/admin/portal/tickets/:id/status/', method='POST',
                screen='beauty_admin_portal_tickets',
                route=h.SCREEN_ROUTES['beauty_admin_portal_tickets'],
                prompt='Update status',
            ),
        },
    }
