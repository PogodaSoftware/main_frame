"""
Beauty Admin Portal API Views
=============================
Endpoints backing the new mobile Admin Portal surface.

- POST /api/beauty/admin/portal/tags/
    Body: { "label": "...", "color": "#RRGGBB", "tone": "#RRGGBB" }
    Auth: requires a Beauty session cookie + admin allowlist match.
    Effect: upserts a BeautyAdminTag row (slug auto-derived from label).
"""

import hashlib
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone

from django.db import transaction
from django.http import JsonResponse
from django.utils.text import slugify
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from bff_api.services.auth_service import get_authenticated_user
from bff_api.services.hateoas_service import is_beauty_admin

from . import audit
from .middleware import SESSION_COOKIE_NAME
from .models import (
    BeautyAdminInvite, BeautyAdminNote, BeautyAdminPrincipal, BeautyAdminTag,
    BeautyAdminTagAssignment, BeautyAdminTicket, BeautyBooking, BeautyChatMessage,
    BeautyUser, BusinessProvider,
)

logger = logging.getLogger(__name__)

_HEX_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')


class AdminTagCreateView(APIView):
    """Create a new admin-managed CRM tag."""

    def post(self, request):
        device_id = request.headers.get('X-Device-ID', '').strip()
        if not device_id:
            return Response({'detail': 'Device identifier missing.'}, status=status.HTTP_400_BAD_REQUEST)

        cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
        user = get_authenticated_user(cookie, device_id)
        if user is None:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not is_beauty_admin(user):
            return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

        label = (request.data.get('label') or '').strip()
        color = (request.data.get('color') or '').strip()
        tone = (request.data.get('tone') or '').strip()

        if not label or len(label) > 64:
            return Response({'detail': 'Label is required (max 64 chars).'}, status=status.HTTP_400_BAD_REQUEST)
        if not _HEX_RE.match(color):
            return Response({'detail': 'Color must be a #RRGGBB hex string.'}, status=status.HTTP_400_BAD_REQUEST)
        if not tone:
            tone = color  # accept color-only; tone synthesised later
        elif not _HEX_RE.match(tone):
            return Response({'detail': 'Tone must be a #RRGGBB hex string.'}, status=status.HTTP_400_BAD_REQUEST)

        slug = slugify(label)[:64] or 'tag'
        # Disambiguate slug collisions.
        candidate = slug
        i = 1
        while BeautyAdminTag.objects.filter(slug=candidate).exists():
            i += 1
            candidate = f'{slug}-{i}'[:64]
        slug = candidate

        tag = BeautyAdminTag.objects.create(slug=slug, label=label, color=color, tone=tone)
        logger.info('Admin tag created: id=%s slug=%s by user=%s', tag.id, tag.slug, user.get('user_id'))
        audit.log_event(
            request=request, user=user, action='tag.create',
            target_type='tag', target_id=tag.id, target_label=tag.label,
            meta={'slug': tag.slug, 'color': tag.color},
        )

        return Response(
            {'id': tag.id, 'slug': tag.slug, 'label': tag.label, 'color': tag.color, 'tone': tag.tone},
            status=status.HTTP_201_CREATED,
        )


_VALID_TAG_TARGETS = ('customer', 'business')


def _resolve_tag_target(target_type: str, target_id: int):
    """Returns (label_or_None) — verifies the (type,id) row exists."""
    if target_type == 'customer':
        u = BeautyUser.objects.filter(id=target_id).only('email').first()
        return (u.email if u else None)
    if target_type == 'business':
        b = BusinessProvider.objects.filter(id=target_id).only('email', 'business_name').first()
        return ((b.business_name or b.email) if b else None)
    return None


class AdminTagAssignView(APIView):
    """POST /api/beauty/admin/portal/tags/<slug>/assign/
    Body: { "type": "customer"|"business", "id": int }
    """

    def post(self, request, slug: str):
        user, err = _admin_or_error(request)
        if err is not None:
            return err

        tag = BeautyAdminTag.objects.filter(slug=slug).first()
        if tag is None:
            return Response({'detail': 'Tag not found.'}, status=status.HTTP_404_NOT_FOUND)

        target_type = (request.data.get('type') or '').strip().lower()
        try:
            target_id = int(request.data.get('id') or 0)
        except (TypeError, ValueError):
            target_id = 0
        if target_type not in _VALID_TAG_TARGETS or target_id <= 0:
            return Response({'detail': 'type must be customer|business and id required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        target_label = _resolve_tag_target(target_type, target_id)
        if target_label is None:
            return Response({'detail': 'Target account not found.'},
                            status=status.HTTP_404_NOT_FOUND)

        assignment, created = BeautyAdminTagAssignment.objects.get_or_create(
            tag=tag, user_type=target_type, user_id=target_id,
            defaults={'assigned_by_email': user.get('email') or ''},
        )
        if created:
            audit.log_event(
                request=request, user=user, action='tag.assign',
                target_type=target_type, target_id=str(target_id), target_label=target_label,
                meta={'tag': tag.slug, 'tag_label': tag.label},
            )

        return Response(
            {
                'tag': tag.slug,
                'type': target_type,
                'id': target_id,
                'assigned_at': assignment.assigned_at.isoformat(),
                'newly_created': created,
            },
            status=status.HTTP_200_OK if not created else status.HTTP_201_CREATED,
        )

    def delete(self, request, slug: str):
        user, err = _admin_or_error(request)
        if err is not None:
            return err

        tag = BeautyAdminTag.objects.filter(slug=slug).first()
        if tag is None:
            return Response({'detail': 'Tag not found.'}, status=status.HTTP_404_NOT_FOUND)

        target_type = (request.query_params.get('type') or request.data.get('type') or '').strip().lower()
        try:
            target_id = int(request.query_params.get('id') or request.data.get('id') or 0)
        except (TypeError, ValueError):
            target_id = 0
        if target_type not in _VALID_TAG_TARGETS or target_id <= 0:
            return Response({'detail': 'type must be customer|business and id required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        deleted, _details = BeautyAdminTagAssignment.objects.filter(
            tag=tag, user_type=target_type, user_id=target_id,
        ).delete()
        if deleted:
            target_label = _resolve_tag_target(target_type, target_id) or ''
            audit.log_event(
                request=request, user=user, action='tag.unassign',
                target_type=target_type, target_id=str(target_id), target_label=target_label,
                meta={'tag': tag.slug, 'tag_label': tag.label},
            )
        return Response({'tag': tag.slug, 'removed': deleted}, status=status.HTTP_200_OK)


def _admin_or_error(request):
    """Return (user, None) on success, or (None, Response) on auth failure."""
    device_id = request.headers.get('X-Device-ID', '').strip()
    if not device_id:
        return None, Response({'detail': 'Device identifier missing.'}, status=status.HTTP_400_BAD_REQUEST)
    cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
    user = get_authenticated_user(cookie, device_id)
    if user is None:
        return None, Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
    if not is_beauty_admin(user):
        return None, Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
    return user, None


class AdminAccountNoteView(APIView):
    """POST /api/beauty/admin/portal/<target_type>/<target_id>/note/
    Body: { "body": "..." }
    """

    def post(self, request, target_type: str, target_id: int):
        user, err = _admin_or_error(request)
        if err:
            return err
        if target_type not in ('customer', 'business'):
            return Response({'detail': 'target_type must be customer or business.'}, status=status.HTTP_400_BAD_REQUEST)

        body = (request.data.get('body') or '').strip()
        if not body:
            return Response({'detail': 'Note body is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(body) > 4000:
            return Response({'detail': 'Note too long (max 4000 chars).'}, status=status.HTTP_400_BAD_REQUEST)

        if target_type == 'customer':
            if not BeautyUser.objects.filter(id=target_id).exists():
                return Response({'detail': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            if not BusinessProvider.objects.filter(id=target_id).exists():
                return Response({'detail': 'Business provider not found.'}, status=status.HTTP_404_NOT_FOUND)

        note = BeautyAdminNote.objects.create(
            target_type=target_type,
            target_id=target_id,
            author_email=user.get('email') or '',
            author_user_type=(user.get('user_type') or ''),
            author_user_id=user.get('user_id'),
            body=body,
        )
        audit.log_event(
            request=request, user=user, action='note.create',
            target_type=target_type, target_id=target_id,
            meta={'note_id': note.id, 'len': len(body)},
        )
        return Response(
            {
                'id': note.id, 'target_type': note.target_type, 'target_id': note.target_id,
                'author_email': note.author_email, 'body': note.body,
                'created_at': note.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class AdminCustomerMessageView(APIView):
    """POST /api/beauty/admin/portal/customer/<customer_id>/message/
    Body: { "body": "..." }
    """

    def post(self, request, customer_id: int):
        user, err = _admin_or_error(request)
        if err:
            return err
        return _send_admin_chat(request, user, 'customer', customer_id, request.data)


class AdminProviderMessageView(APIView):
    """POST /api/beauty/admin/portal/business/<provider_id>/message/
    Body: { "body": "..." }
    """

    def post(self, request, provider_id: int):
        user, err = _admin_or_error(request)
        if err:
            return err
        return _send_admin_chat(request, user, 'business', provider_id, request.data)


def _send_admin_chat(request, user, target_type: str, target_id: int, data) -> Response:
    body = (data.get('body') or '').strip()
    if not body:
        return Response({'detail': 'Message body is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if len(body) > 2000:
        return Response({'detail': 'Message too long (max 2000 chars).'}, status=status.HTTP_400_BAD_REQUEST)

    if target_type == 'customer':
        if not BeautyUser.objects.filter(id=target_id).exists():
            return Response({'detail': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)
        bookings_qs = (
            BeautyBooking.objects
            .filter(customer_id=target_id)
            .exclude(status__in=BeautyBooking.CANCELLED_STATUSES)
            .order_by('-slot_at')
        )
    elif target_type == 'business':
        if not BusinessProvider.objects.filter(id=target_id).exists():
            return Response({'detail': 'Business provider not found.'}, status=status.HTTP_404_NOT_FOUND)
        bookings_qs = (
            BeautyBooking.objects
            .filter(service__provider__business_provider_id=target_id)
            .exclude(status__in=BeautyBooking.CANCELLED_STATUSES)
            .order_by('-slot_at')
        )
    else:
        return Response({'detail': 'Bad target_type.'}, status=status.HTTP_400_BAD_REQUEST)

    booking = bookings_qs.first()
    if booking is None:
        return Response(
            {'detail': 'No active booking thread to deliver into.'},
            status=status.HTTP_409_CONFLICT,
        )

    msg = BeautyChatMessage.objects.create(
        booking=booking,
        sender_type=BeautyChatMessage.SENDER_ADMIN,
        sender_id=user.get('user_id') or 0,
        body=body,
    )
    audit.log_event(
        request=request, user=user, action='message.send',
        target_type=target_type, target_id=target_id,
        meta={'booking_id': booking.id, 'len': len(body)},
    )
    return Response(
        {'id': msg.id, 'booking_id': booking.id, 'body': msg.body,
         'created_at': msg.created_at.isoformat()},
        status=status.HTTP_201_CREATED,
    )


class AdminAccountExportView(APIView):
    """GET /api/beauty/admin/portal/<target_type>/<target_id>/export/
    Returns a JSON blob with the account record + bookings + notes.
    """

    def get(self, request, target_type: str, target_id: int):
        user, err = _admin_or_error(request)
        if err:
            return err
        if target_type not in ('customer', 'business'):
            return Response({'detail': 'target_type must be customer or business.'}, status=status.HTTP_400_BAD_REQUEST)

        payload: dict = {'exported_at': datetime.now(timezone.utc).isoformat(),
                         'exported_by': user.get('email'), 'target_type': target_type, 'target_id': target_id}

        if target_type == 'customer':
            u = BeautyUser.objects.filter(id=target_id).first()
            if not u:
                return Response({'detail': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)
            payload['account'] = {
                'id': u.id, 'email': u.email, 'created_at': u.created_at.isoformat(),
                'is_suspended': u.is_suspended,
                'suspended_at': u.suspended_at.isoformat() if u.suspended_at else None,
            }
            payload['bookings'] = [
                {
                    'id': b.id, 'slot_at': b.slot_at.isoformat(), 'status': b.status,
                    'service_name': b.service_name_at_booking,
                    'price_dollars': str(b.service_price_dollars_at_booking) if b.service_price_dollars_at_booking is not None else None,
                }
                for b in BeautyBooking.objects.filter(customer_id=u.id).order_by('-slot_at')
            ]
        else:
            p = BusinessProvider.objects.filter(id=target_id).first()
            if not p:
                return Response({'detail': 'Business provider not found.'}, status=status.HTTP_404_NOT_FOUND)
            payload['account'] = {
                'id': p.id, 'email': p.email, 'business_name': p.business_name,
                'created_at': p.created_at.isoformat(),
                'is_suspended': p.is_suspended,
                'suspended_at': p.suspended_at.isoformat() if p.suspended_at else None,
            }

        payload['notes'] = [
            {
                'id': n.id, 'author_email': n.author_email,
                'body': n.body, 'created_at': n.created_at.isoformat(),
            }
            for n in BeautyAdminNote.objects.filter(target_type=target_type, target_id=target_id).order_by('-created_at')
        ]

        audit.log_event(
            request=request, user=user, action='account.export',
            target_type=target_type, target_id=target_id,
            meta={'bookings': len(payload.get('bookings', [])),
                  'notes': len(payload.get('notes', []))},
        )
        resp = JsonResponse(payload, json_dumps_params={'indent': 2})
        resp['Content-Disposition'] = f'attachment; filename="beauty-{target_type}-{target_id}-export.json"'
        return resp


_VALID_PRIORITIES = {p for p, _ in BeautyAdminTicket.PRIORITY_CHOICES}
_VALID_CATEGORIES = {c for c, _ in BeautyAdminTicket.CATEGORY_CHOICES}
_VALID_STATUSES = {s for s, _ in BeautyAdminTicket.STATUS_CHOICES}
_VALID_SOURCES = {s for s, _ in BeautyAdminTicket.SOURCE_CHOICES}


class AdminTicketCreateView(APIView):
    """POST /api/beauty/admin/portal/tickets/
    Body: { subject, priority, category, source, body?, from_principal_type?, from_principal_id?, from_label? }
    """

    def post(self, request):
        user, err = _admin_or_error(request)
        if err:
            return err

        subject = (request.data.get('subject') or '').strip()
        if not subject:
            return Response({'detail': 'Subject is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(subject) > 255:
            return Response({'detail': 'Subject too long.'}, status=status.HTTP_400_BAD_REQUEST)

        priority = (request.data.get('priority') or 'med').lower()
        category = (request.data.get('category') or 'other').lower()
        source = (request.data.get('source') or 'in_app').lower()
        if priority not in _VALID_PRIORITIES:
            return Response({'detail': f'Invalid priority.'}, status=status.HTTP_400_BAD_REQUEST)
        if category not in _VALID_CATEGORIES:
            return Response({'detail': f'Invalid category.'}, status=status.HTTP_400_BAD_REQUEST)
        if source not in _VALID_SOURCES:
            return Response({'detail': f'Invalid source.'}, status=status.HTTP_400_BAD_REQUEST)

        from_type = (request.data.get('from_principal_type') or '').lower() or ''
        if from_type and from_type not in (BeautyAdminTicket.FROM_CUSTOMER, BeautyAdminTicket.FROM_BUSINESS, BeautyAdminTicket.FROM_SYSTEM):
            return Response({'detail': 'Invalid from_principal_type.'}, status=status.HTTP_400_BAD_REQUEST)

        t = BeautyAdminTicket.objects.create(
            priority=priority,
            category=category,
            source=source,
            subject=subject,
            body=(request.data.get('body') or '').strip(),
            from_principal_type=from_type,
            from_principal_id=request.data.get('from_principal_id') or None,
            from_label=(request.data.get('from_label') or '').strip()[:128],
        )
        audit.log_event(
            request=request, user=user, action='ticket.create',
            target_type='ticket', target_id=t.id, target_label=t.subject[:255],
            meta={'priority': t.priority, 'category': t.category, 'source': t.source},
        )
        return Response({'id': t.id, 'subject': t.subject, 'priority': t.priority,
                         'category': t.category, 'status': t.status, 'source': t.source,
                         'created_at': t.created_at.isoformat()},
                        status=status.HTTP_201_CREATED)


class AdminTicketAssignView(APIView):
    """POST /api/beauty/admin/portal/tickets/<id>/assign/
    Body: { "assignee_email": "..." } -- empty string unassigns.
    """

    def post(self, request, ticket_id: int):
        user, err = _admin_or_error(request)
        if err:
            return err
        t = BeautyAdminTicket.objects.filter(id=ticket_id).first()
        if not t:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)
        prev_assignee = t.assignee_email
        assignee = (request.data.get('assignee_email') or '').strip()
        t.assignee_email = assignee
        if assignee and t.status == BeautyAdminTicket.STATUS_NEW:
            t.status = BeautyAdminTicket.STATUS_IN_PROGRESS
        t.save(update_fields=['assignee_email', 'status', 'updated_at'])
        audit.log_event(
            request=request, user=user, action='ticket.assign',
            target_type='ticket', target_id=t.id, target_label=t.subject[:255],
            meta={'from': prev_assignee, 'to': assignee, 'status': t.status},
        )
        return Response({'id': t.id, 'assignee_email': t.assignee_email, 'status': t.status})


class AdminTicketStatusView(APIView):
    """POST /api/beauty/admin/portal/tickets/<id>/status/
    Body: { "status": "new|in_progress|waiting|resolved" }
    """

    def post(self, request, ticket_id: int):
        user, err = _admin_or_error(request)
        if err:
            return err
        t = BeautyAdminTicket.objects.filter(id=ticket_id).first()
        if not t:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)
        new_status = (request.data.get('status') or '').lower()
        if new_status not in _VALID_STATUSES:
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)
        prev_status = t.status
        t.status = new_status
        t.save(update_fields=['status', 'updated_at'])
        audit.log_event(
            request=request, user=user, action='ticket.status',
            target_type='ticket', target_id=t.id, target_label=t.subject[:255],
            meta={'from': prev_status, 'to': new_status},
        )
        return Response({'id': t.id, 'status': t.status})


# ---------------------------------------------------------------------------
# Admin team management
# ---------------------------------------------------------------------------

_VALID_ROLES = {r for r, _ in BeautyAdminPrincipal.ROLE_CHOICES}
_OWNER = BeautyAdminPrincipal.ROLE_OWNER
_INVITE_TTL_HOURS = 72


def _owner_or_error(request):
    """Owner-only gate. Returns (user, principal, None) on success."""
    user, err = _admin_or_error(request)
    if err:
        return None, None, err
    p = BeautyAdminPrincipal.objects.filter(
        user_type=user.get('user_type') or '',
        user_id=user.get('user_id'),
    ).first()
    if not p or p.role != _OWNER:
        return None, None, Response(
            {'detail': 'Owner role required for this action.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return user, p, None


def _owner_count(exclude_principal_id: int | None = None) -> int:
    qs = BeautyAdminPrincipal.objects.filter(role=_OWNER)
    if exclude_principal_id is not None:
        qs = qs.exclude(id=exclude_principal_id)
    return qs.count()


def _resolve_principal_email(p: BeautyAdminPrincipal) -> str:
    if p.user_type == 'customer':
        u = BeautyUser.objects.filter(id=p.user_id).only('email').first()
        return u.email if u else ''
    if p.user_type == 'business':
        b = BusinessProvider.objects.filter(id=p.user_id).only('email').first()
        return b.email if b else ''
    return ''


class AdminTeamInviteView(APIView):
    """POST /api/beauty/admin/portal/team/invite/
    Body: { "email": "...", "role": "owner|support_lead|risk_analyst|support_agent" }
    Owner-only. Creates a BeautyAdminInvite + logs the consume URL.
    """

    def post(self, request):
        user, _principal, err = _owner_or_error(request)
        if err:
            return err
        email = (request.data.get('email') or '').strip().lower()
        role = (request.data.get('role') or '').strip().lower()
        if '@' not in email or len(email) > 254:
            return Response({'detail': 'Valid email required.'}, status=status.HTTP_400_BAD_REQUEST)
        if role not in _VALID_ROLES:
            return Response({'detail': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate a single-use opaque token; only store its hash.
        raw_token = secrets.token_urlsafe(24)
        token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
        expires = datetime.now(timezone.utc) + timedelta(hours=_INVITE_TTL_HOURS)
        invite = BeautyAdminInvite.objects.create(
            email=email,
            role=role,
            token_hash=token_hash,
            created_by_user_type=user.get('user_type') or '',
            created_by_user_id=user.get('user_id'),
            created_by_email=user.get('email') or '',
            expires_at=expires,
        )

        consume_path = f'/api/beauty/admin/portal/team/invite/{raw_token}/'
        logger.info(
            'Admin invite stub email: to=%s role=%s url=%s (expires %s)',
            email, role, consume_path, expires.isoformat(),
        )
        audit.log_event(
            request=request, user=user, action='team.invite',
            target_type='admin', target_id=invite.id, target_label=email,
            meta={'role': role, 'expires_at': expires.isoformat()},
        )
        return Response(
            {
                'id': invite.id, 'email': invite.email, 'role': invite.role,
                'expires_at': expires.isoformat(),
                'consume_path': consume_path,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminTeamRoleView(APIView):
    """PATCH /api/beauty/admin/portal/team/<principal_id>/role/
    Body: { "role": "owner|support_lead|risk_analyst|support_agent" }
    Owner-only. Blocks demoting the last Owner.
    """

    def patch(self, request, principal_id: int):
        user, _principal, err = _owner_or_error(request)
        if err:
            return err
        target = BeautyAdminPrincipal.objects.filter(id=principal_id).first()
        if not target:
            return Response({'detail': 'Admin not found.'}, status=status.HTTP_404_NOT_FOUND)
        new_role = (request.data.get('role') or '').strip().lower()
        if new_role not in _VALID_ROLES:
            return Response({'detail': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)
        if target.role == _OWNER and new_role != _OWNER and _owner_count(target.id) == 0:
            return Response(
                {'detail': 'Cannot demote the last Owner.'},
                status=status.HTTP_409_CONFLICT,
            )
        prev_role = target.role
        target.role = new_role
        target.save(update_fields=['role'])
        audit.log_event(
            request=request, user=user, action='team.role',
            target_type='admin', target_id=target.id,
            target_label=_resolve_principal_email(target),
            meta={'from': prev_role, 'to': new_role,
                  'user_type': target.user_type, 'user_id': target.user_id},
        )
        return Response({'id': target.id, 'role': target.role})


class AdminTeamRevokeView(APIView):
    """DELETE /api/beauty/admin/portal/team/<principal_id>/
    Owner-only. Removes admin access. Blocks deleting the last Owner.
    """

    def delete(self, request, principal_id: int):
        user, principal, err = _owner_or_error(request)
        if err:
            return err
        target = BeautyAdminPrincipal.objects.filter(id=principal_id).first()
        if not target:
            return Response({'detail': 'Admin not found.'}, status=status.HTTP_404_NOT_FOUND)
        if target.id == principal.id:
            return Response(
                {'detail': 'Cannot revoke your own admin access.'},
                status=status.HTTP_409_CONFLICT,
            )
        if target.role == _OWNER and _owner_count(target.id) == 0:
            return Response(
                {'detail': 'Cannot revoke the last Owner.'},
                status=status.HTTP_409_CONFLICT,
            )
        email_snapshot = _resolve_principal_email(target)
        meta = {'user_type': target.user_type, 'user_id': target.user_id, 'role': target.role}
        target.delete()
        audit.log_event(
            request=request, user=user, action='team.revoke',
            target_type='admin', target_id=principal_id, target_label=email_snapshot,
            meta=meta,
        )
        return Response({'id': principal_id, 'revoked': True})


class AdminInviteConsumeView(APIView):
    """GET /api/beauty/admin/portal/team/invite/<token>/
    Resolves the invite token, marks consumed, creates a principal for
    the current session user matching the invited email.
    """

    def get(self, request, token: str):
        device_id = request.headers.get('X-Device-ID', '').strip()
        if not device_id:
            return Response({'detail': 'Device identifier missing.'}, status=status.HTTP_400_BAD_REQUEST)
        cookie = request.COOKIES.get(SESSION_COOKIE_NAME)
        user = get_authenticated_user(cookie, device_id)
        if user is None:
            return Response({'detail': 'Sign in first to consume invite.'},
                            status=status.HTTP_401_UNAUTHORIZED)

        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        invite = BeautyAdminInvite.objects.filter(token_hash=token_hash).first()
        if not invite:
            return Response({'detail': 'Invite not found.'}, status=status.HTTP_404_NOT_FOUND)
        if invite.consumed_at is not None:
            return Response({'detail': 'Invite already consumed.'}, status=status.HTTP_409_CONFLICT)
        if invite.expires_at < datetime.now(timezone.utc):
            return Response({'detail': 'Invite expired.'}, status=status.HTTP_410_GONE)
        if (user.get('email') or '').strip().lower() != invite.email.lower():
            return Response({'detail': 'Signed-in email does not match invite.'},
                            status=status.HTTP_403_FORBIDDEN)

        principal, _ = BeautyAdminPrincipal.objects.get_or_create(
            user_type=user.get('user_type') or '',
            user_id=user.get('user_id'),
            defaults={'role': invite.role, 'display_name': ''},
        )
        # If the principal already existed (re-invite), bump the role.
        if principal.role != invite.role:
            principal.role = invite.role
            principal.save(update_fields=['role'])
        invite.consumed_at = datetime.now(timezone.utc)
        invite.save(update_fields=['consumed_at'])

        audit.log_event(
            request=request, user=user, action='team.invite_consumed',
            target_type='admin', target_id=principal.id, target_label=invite.email,
            meta={'role': invite.role, 'invite_id': invite.id},
        )
        return Response({'principal_id': principal.id, 'role': principal.role})
