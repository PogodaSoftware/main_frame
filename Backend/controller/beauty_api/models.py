from django.db import models
from django.contrib.auth.hashers import make_password


class BeautyUser(models.Model):
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    is_suspended = models.BooleanField(default=False)
    suspended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'beauty_users'

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def __str__(self):
        return self.email


class BusinessProvider(models.Model):
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    business_name = models.CharField(max_length=255)
    public_email = models.EmailField(blank=True, default='')
    contact_phone = models.CharField(max_length=32, blank=True, default='')
    show_phone_publicly = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_suspended = models.BooleanField(default=False)
    suspended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'beauty_business_providers'

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def __str__(self):
        return f"{self.business_name} ({self.email})"


class BeautySession(models.Model):
    USER_TYPE_CUSTOMER = 'customer'
    USER_TYPE_BUSINESS = 'business'
    USER_TYPE_CHOICES = [
        (USER_TYPE_CUSTOMER, 'Customer'),
        (USER_TYPE_BUSINESS, 'Business Provider'),
    ]

    user_id = models.IntegerField()
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES)
    device_id = models.CharField(max_length=255)
    token_hash = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'beauty_sessions'
        indexes = [
            models.Index(fields=['token_hash'], name='beauty_sess_token_h_idx'),
            models.Index(fields=['user_id', 'user_type', 'device_id'], name='beauty_sess_user_dev_idx'),
        ]

    def __str__(self):
        return f"{self.user_type}:{self.user_id} @ {self.device_id}"


class BeautyFeatureFlag(models.Model):
    """
    Runtime feature flag for the Beauty BFF.

    The HateoasService consults this table on every resolve so toggling
    a flag takes effect on the next BFF call — no redeploy required.
    If a key is missing here, the env-var default is used as a fallback.
    """

    key = models.CharField(max_length=64, unique=True)
    enabled = models.BooleanField(default=True)
    description = models.CharField(max_length=255, blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)
    updated_by_user_id = models.IntegerField(null=True, blank=True)
    updated_by_email = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        db_table = 'beauty_feature_flags'

    def __str__(self):
        return f"{self.key}={'on' if self.enabled else 'off'}"


class BeautyProvider(models.Model):
    """
    A beauty provider/storefront that customers browse and book against.

    A provider is conceptually independent of `BusinessProvider` (the auth
    account) so the customer-facing catalog can exist before any business
    portal work is done. When the business portal is built, a provider row
    can be linked to a `BusinessProvider` via `business_provider_id`.
    """

    name = models.CharField(max_length=255)
    short_description = models.CharField(max_length=255, blank=True, default='')
    long_description = models.TextField(blank=True, default='')
    location_label = models.CharField(max_length=255, blank=True, default='')
    business_provider_id = models.IntegerField(null=True, blank=True)
    # Canonical IANA timezone (e.g. "America/New_York") the storefront's
    # recurring weekly hours are expressed in. Booking instants stay UTC; this
    # anchors the wall-clock -> UTC conversion (DST-correct via zoneinfo).
    # Blank = not explicitly set: resolve_timezone() then derives from
    # location_label. Auto-detected from the provider's device at onboarding.
    timezone = models.CharField(max_length=64, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_providers'
        ordering = ['name']

    def __str__(self):
        return self.name


class BeautyService(models.Model):
    """A service offered by a provider, in one of the home-page categories."""

    CATEGORY_FACIAL = 'facial'
    CATEGORY_MASSAGE = 'massage'
    CATEGORY_NAILS = 'nails'
    CATEGORY_HAIR = 'hair'
    CATEGORY_CHOICES = [
        (CATEGORY_FACIAL, 'Facial'),
        (CATEGORY_MASSAGE, 'Massage'),
        (CATEGORY_NAILS, 'Nails'),
        (CATEGORY_HAIR, 'Hair'),
    ]

    provider = models.ForeignKey(
        BeautyProvider, on_delete=models.CASCADE, related_name='services'
    )
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255, blank=True, default='')
    price_cents = models.IntegerField(default=0)
    # Dollar-denominated mirror of price_cents. Source of truth for the new
    # provider portal UI (see Business Provider Portal handoff). Stored as
    # Decimal(10,2) so 49.99 round-trips exactly. Kept in sync with
    # price_cents on save (cents = round(dollars * 100)).
    price_dollars = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    duration_minutes = models.IntegerField(default=60)
    # Customer search support. ``service_locations`` is a list of city /
    # postal-code strings the service is offered in (empty list = "global"
    # — match every location). ``is_future`` flags scheduled-but-not-active
    # offerings so customers can discover upcoming services in the same
    # search index.
    service_locations = models.JSONField(default=list, blank=True)
    is_future = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_services'
        ordering = ['provider__name', 'name']
        indexes = [
            models.Index(fields=['category'], name='beauty_svc_cat_idx'),
            models.Index(fields=['provider', 'category'], name='beauty_svc_prov_cat_idx'),
            models.Index(fields=['is_future'], name='beauty_svc_future_idx'),
        ]

    def __str__(self):
        return f"{self.name} @ {self.provider.name}"


class BeautyBooking(models.Model):
    """A reservation made by a customer (`BeautyUser`) for a `BeautyService`.

    Data immutability of service snapshot
    -------------------------------------
    Past bookings MUST keep showing the price/duration/name they had at the
    moment the booking was created — even if the business edits or removes
    the live `BeautyService` later. To preserve that history we snapshot the
    relevant service fields onto the booking row at create time:

    - ``service_name_at_booking``
    - ``service_price_cents_at_booking``
    - ``service_duration_minutes_at_booking``

    All booking-render code (resolvers, REST views, serializers) MUST prefer
    the snapshot fields over `self.service.*`, falling back to the FK only
    if a snapshot is missing (legacy rows pre-migration). DO NOT remove the
    snapshot columns or rewire the resolvers to read from `self.service.*`
    "for simplicity" — that would silently mutate historical receipts when
    a provider tweaks a service.

    Cancellation states
    -------------------
    Three distinct cancellation flavours coexist:

    - ``cancelled_by_customer`` — customer pulled out after the grace
      period; no automatic refund.
    - ``cancelled_by_business`` — business pulled out; refund is owed and
      should be triggered (see TODOs in cancel handlers).
    - ``cancelled_immediate``  — customer cancelled within the grace
      period; refund + the booking is hidden from My Bookings (treated
      as never-happened).
    """

    STATUS_BOOKED = 'booked'
    # Legacy literal `cancelled` is retained as a backward-compat alias
    # so any pre-migration rows continue to render (treated like
    # `cancelled_by_customer` everywhere downstream).
    STATUS_CANCELLED = 'cancelled'
    STATUS_CANCELLED_BY_CUSTOMER = 'cancelled_by_customer'
    STATUS_CANCELLED_BY_BUSINESS = 'cancelled_by_business'
    STATUS_CANCELLED_IMMEDIATE = 'cancelled_immediate'
    STATUS_COMPLETED = 'completed'
    STATUS_CHOICES = [
        (STATUS_BOOKED, 'Booked'),
        (STATUS_CANCELLED, 'Cancelled (legacy)'),
        (STATUS_CANCELLED_BY_CUSTOMER, 'Cancelled by customer'),
        (STATUS_CANCELLED_BY_BUSINESS, 'Cancelled by business'),
        (STATUS_CANCELLED_IMMEDIATE, 'Cancelled within grace period'),
        (STATUS_COMPLETED, 'Completed'),
    ]

    # Any of these means the booking is no longer active.
    CANCELLED_STATUSES = (
        STATUS_CANCELLED,
        STATUS_CANCELLED_BY_CUSTOMER,
        STATUS_CANCELLED_BY_BUSINESS,
        STATUS_CANCELLED_IMMEDIATE,
    )

    customer = models.ForeignKey(
        BeautyUser, on_delete=models.CASCADE, related_name='bookings'
    )
    service = models.ForeignKey(
        BeautyService, on_delete=models.PROTECT, related_name='bookings'
    )
    slot_at = models.DateTimeField()
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_BOOKED)
    created_at = models.DateTimeField(auto_now_add=True)

    # Snapshot of the BeautyService fields at booking time. See class docstring.
    service_name_at_booking = models.CharField(max_length=255, blank=True, default='')
    service_price_cents_at_booking = models.IntegerField(null=True, blank=True)
    service_price_dollars_at_booking = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    service_duration_minutes_at_booking = models.IntegerField(null=True, blank=True)

    # When non-null and `now() < grace_period_ends_at`, the customer can
    # cancel "immediately" with full refund and have the booking hidden
    # from their past list. Set automatically on create from
    # `BEAUTY_GRACE_PERIOD_MINUTES` (default 5).
    grace_period_ends_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'beauty_bookings'
        ordering = ['-slot_at']
        indexes = [
            models.Index(fields=['customer', '-slot_at'], name='beauty_bk_cust_slot_idx'),
            models.Index(fields=['service', 'slot_at'], name='beauty_bk_svc_slot_idx'),
        ]

    # Snapshot accessors — always prefer the snapshot, fall back to FK.
    @property
    def display_service_name(self) -> str:
        return self.service_name_at_booking or self.service.name

    @property
    def display_price_cents(self) -> int:
        if self.service_price_cents_at_booking is not None:
            return self.service_price_cents_at_booking
        return self.service.price_cents

    @property
    def display_price_dollars(self) -> str:
        from decimal import Decimal
        if self.service_price_dollars_at_booking is not None:
            return f"{self.service_price_dollars_at_booking:.2f}"
        return f"{Decimal(self.display_price_cents) / Decimal(100):.2f}"

    @property
    def display_duration_minutes(self) -> int:
        if self.service_duration_minutes_at_booking is not None:
            return self.service_duration_minutes_at_booking
        return self.service.duration_minutes

    def __str__(self):
        return f"{self.customer.email} → {self.display_service_name} @ {self.slot_at:%Y-%m-%d %H:%M}"


class BeautyProviderAvailability(models.Model):
    """
    Weekly business hours for a provider's storefront.

    Exactly one row per (provider, day_of_week) — enforced by a unique
    constraint. The slot-computation service (`availability_service`) uses
    these rows to project bookable slots a few weeks into the future.
    """

    DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    provider = models.ForeignKey(
        BeautyProvider, on_delete=models.CASCADE, related_name='availability'
    )
    day_of_week = models.IntegerField(help_text='0=Mon, 6=Sun')
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_closed = models.BooleanField(default=False)
    # When True, the provider is considered open the full 24 hours of
    # that day. start_time/end_time are then ignored by the slot
    # computation and the booking-time validation.
    is_24h = models.BooleanField(default=False)

    class Meta:
        db_table = 'beauty_provider_availability'
        ordering = ['provider__name', 'day_of_week']
        constraints = [
            models.UniqueConstraint(
                fields=['provider', 'day_of_week'],
                name='beauty_avail_unique_dow',
            ),
        ]

    def __str__(self):
        label = self.DOW_LABELS[self.day_of_week] if 0 <= self.day_of_week < 7 else '?'
        if self.is_closed:
            return f"{self.provider.name} · {label} closed"
        if self.is_24h:
            return f"{self.provider.name} · {label} 24h"
        return f"{self.provider.name} · {label} {self.start_time}-{self.end_time}"


class BusinessProviderApplication(models.Model):
    """Onboarding application for a `BusinessProvider`.

    Gates portal access. A new business signup creates a `BusinessProvider`
    auth account; the portal stays locked behind the wizard until this
    row reaches ``status=accepted``. Each step's payload lands here via
    PATCH; submission flips the row to accepted (auto-approved this round)
    so the user is sent to the new business home.
    """

    STATUS_DRAFT = 'draft'
    STATUS_SUBMITTED = 'submitted'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_SUBMITTED, 'Submitted'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    ENTITY_PERSON = 'person'
    ENTITY_BUSINESS = 'business'
    ENTITY_CHOICES = [
        (ENTITY_PERSON, 'Person'),
        (ENTITY_BUSINESS, 'Business'),
    ]

    STEP_ORDER = ['entity', 'services', 'stripe', 'schedule', 'tools']

    business_provider = models.OneToOneField(
        BusinessProvider, on_delete=models.CASCADE, related_name='application',
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    entity_type = models.CharField(max_length=16, choices=ENTITY_CHOICES, blank=True, default='')
    itin = models.CharField(max_length=9, blank=True, default='')
    applicant_first_name = models.CharField(max_length=128, blank=True, default='')
    applicant_last_name = models.CharField(max_length=128, blank=True, default='')
    business_name = models.CharField(max_length=255, blank=True, default='')
    address_line1 = models.CharField(max_length=255, blank=True, default='')
    address_line2 = models.CharField(max_length=255, blank=True, default='')
    city = models.CharField(max_length=128, blank=True, default='')
    state = models.CharField(max_length=64, blank=True, default='')
    postal_code = models.CharField(max_length=32, blank=True, default='')
    selected_categories = models.JSONField(default=list, blank=True)
    third_party_tools = models.JSONField(default=list, blank=True)
    completed_steps = models.JSONField(default=list, blank=True)
    tos_accepted_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'beauty_business_applications'

    def is_step_complete(self, step: str) -> bool:
        return step in (self.completed_steps or [])

    def mark_step_complete(self, step: str) -> None:
        steps = list(self.completed_steps or [])
        if step in self.STEP_ORDER and step not in steps:
            steps.append(step)
            self.completed_steps = steps

    def next_incomplete_step(self) -> str | None:
        completed = set(self.completed_steps or [])
        for step in self.STEP_ORDER:
            if step not in completed:
                return step
        return None

    def is_ready_to_submit(self) -> bool:
        if self.next_incomplete_step() is not None:
            return False
        if not self.tos_accepted_at:
            return False
        if not self.applicant_first_name.strip() or not self.applicant_last_name.strip():
            return False
        if not self.business_name.strip():
            return False
        if self.entity_type == self.ENTITY_BUSINESS and len(self.itin) != 9:
            return False
        if not self.selected_categories:
            return False
        return True

    def __str__(self):
        return f"{self.business_provider.email} [{self.status}]"


class BeautyReview(models.Model):
    """Customer review of a `BeautyService`.

    Eligibility (enforced in views, not at the DB level): a customer can
    only post a review for a service if they have at least one
    `BeautyBooking` for that service with `status = 'completed'`.

    Replies: the business that owns the service can post one
    `business_reply`. The reply may be edited by the business but the
    business cannot edit or delete the customer's underlying review.
    """

    customer = models.ForeignKey(
        BeautyUser, on_delete=models.CASCADE, related_name='reviews',
    )
    service = models.ForeignKey(
        BeautyService, on_delete=models.CASCADE, related_name='reviews',
    )
    booking = models.ForeignKey(
        BeautyBooking, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='reviews',
    )
    rating = models.IntegerField()
    body = models.TextField(blank=True, default='')
    business_reply = models.TextField(blank=True, default='')
    business_reply_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'beauty_reviews'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['customer', 'service'],
                name='beauty_review_unique_per_svc',
            ),
        ]
        indexes = [
            models.Index(fields=['service', '-created_at'], name='beauty_review_svc_idx'),
        ]

    def __str__(self):
        return f"review#{self.id} {self.customer.email} -> {self.service.name} ({self.rating})"


class BeautyFavorite(models.Model):
    """Customer-saved (favorited) `BeautyService`.

    One row per (customer, service) pair, enforced by a unique
    constraint. Customer-only — business accounts cannot favorite (the
    view layer rejects them at `_require_customer`).
    """

    customer = models.ForeignKey(
        BeautyUser, on_delete=models.CASCADE, related_name='favorites',
    )
    service = models.ForeignKey(
        BeautyService, on_delete=models.CASCADE, related_name='favorited_by',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_favorites'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['customer', 'service'],
                name='beauty_favorite_unique',
            ),
        ]
        indexes = [
            models.Index(fields=['customer', '-created_at'], name='beauty_fav_cust_at_idx'),
        ]

    def __str__(self):
        return f"fav#{self.id} {self.customer.email} -> {self.service.name}"


class BeautyChatMessage(models.Model):
    """Single message in a per-booking chat thread between the customer
    and the business provider.

    Eligibility
    -----------
    A message can only be created when the row's booking has a
    non-cancelled status (``booked`` or ``completed``). The view layer
    enforces this so chats never exist before an appointment is booked.

    Retention
    ---------
    Messages are deleted 24 hours after the booking's service finishes
    (``slot_at + duration``). Cleanup is best-effort and runs lazily on
    every chat read via ``prune_expired_for(booking)`` plus a global
    sweep helper.
    """

    SENDER_CUSTOMER = 'customer'
    SENDER_BUSINESS = 'business'
    SENDER_ADMIN = 'admin'
    SENDER_CHOICES = [
        (SENDER_CUSTOMER, 'Customer'),
        (SENDER_BUSINESS, 'Business Provider'),
        (SENDER_ADMIN, 'Admin'),
    ]

    booking = models.ForeignKey(
        BeautyBooking, on_delete=models.CASCADE, related_name='chat_messages',
    )
    sender_type = models.CharField(max_length=16, choices=SENDER_CHOICES)
    sender_id = models.IntegerField()
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_chat_messages'
        ordering = ['created_at', 'id']
        indexes = [
            models.Index(fields=['booking', 'created_at'], name='beauty_chat_bk_at_idx'),
        ]

    def __str__(self):
        return f"chat#{self.booking_id} {self.sender_type}:{self.sender_id} @ {self.created_at:%Y-%m-%d %H:%M}"


class BeautyChatRead(models.Model):
    """Per-viewer read marker for a booking's chat thread.

    One row per (booking, viewer) records the moment that viewer last
    opened the thread. Unread = messages from the *other* party created
    after ``last_read_at``. A missing row means the viewer has never
    opened the thread (everything from the peer counts as unread).

    Viewer identity mirrors ``BeautyChatMessage.sender_type`` /
    ``sender_id`` (``customer``→BeautyUser.id, ``business``→
    BusinessProvider.id). Rows cascade-delete with the booking, same as
    the messages themselves.
    """

    booking = models.ForeignKey(
        BeautyBooking, on_delete=models.CASCADE, related_name='chat_reads',
    )
    viewer_type = models.CharField(max_length=16, choices=BeautyChatMessage.SENDER_CHOICES)
    viewer_id = models.IntegerField()
    last_read_at = models.DateTimeField()

    class Meta:
        db_table = 'beauty_chat_reads'
        constraints = [
            models.UniqueConstraint(
                fields=['booking', 'viewer_type', 'viewer_id'],
                name='beauty_chat_read_unique',
            ),
        ]
        indexes = [
            models.Index(fields=['viewer_type', 'viewer_id'], name='beauty_chat_read_viewer_idx'),
        ]

    def __str__(self):
        return f"read#{self.booking_id} {self.viewer_type}:{self.viewer_id} @ {self.last_read_at:%Y-%m-%d %H:%M}"


class BeautyAdminPrincipal(models.Model):
    """
    Grants admin access to the Beauty CRM/admin surfaces.

    A row here is equivalent to listing `<user_type>:<user_id>` in the
    BEAUTY_ADMIN_PRINCIPALS env var.  Both sources are consulted on every
    request by `hateoas_service._admin_principal_allowlist()`.

    We bind to (user_type, user_id) — the stable PK identity — rather than
    email because BeautyUser and BusinessProvider are independent tables with
    no cross-table email uniqueness, so the same email could identify two
    different principals.
    """

    USER_TYPE_CUSTOMER = 'customer'
    USER_TYPE_BUSINESS = 'business'
    USER_TYPE_CHOICES = [
        (USER_TYPE_CUSTOMER, 'Customer'),
        (USER_TYPE_BUSINESS, 'Business Provider'),
    ]

    ROLE_OWNER = 'owner'
    ROLE_SUPPORT_LEAD = 'support_lead'
    ROLE_RISK_ANALYST = 'risk_analyst'
    ROLE_SUPPORT_AGENT = 'support_agent'
    ROLE_CHOICES = [
        (ROLE_OWNER, 'Owner'),
        (ROLE_SUPPORT_LEAD, 'Support lead'),
        (ROLE_RISK_ANALYST, 'Risk analyst'),
        (ROLE_SUPPORT_AGENT, 'Support agent'),
    ]

    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES)
    user_id = models.IntegerField()
    role = models.CharField(max_length=24, choices=ROLE_CHOICES, default=ROLE_SUPPORT_AGENT)
    display_name = models.CharField(max_length=128, blank=True, default='')
    last_active_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_admin_principals'
        constraints = [
            models.UniqueConstraint(
                fields=['user_type', 'user_id'],
                name='beauty_admin_principal_unique',
            ),
        ]

    def __str__(self):
        return f"{self.user_type}:{self.user_id}"


class BeautyAdminInvite(models.Model):
    """
    Pending admin invite. A row exists from the moment an Owner sends the
    invite until the target user signs up + consumes the token. On consume
    we delete the invite and create a BeautyAdminPrincipal with the
    invited role.
    """

    email = models.EmailField()
    role = models.CharField(max_length=24, choices=BeautyAdminPrincipal.ROLE_CHOICES,
                            default=BeautyAdminPrincipal.ROLE_SUPPORT_AGENT)
    token_hash = models.CharField(max_length=128, unique=True)
    created_by_user_type = models.CharField(max_length=16, blank=True, default='')
    created_by_user_id = models.IntegerField(null=True, blank=True)
    created_by_email = models.EmailField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'beauty_admin_invites'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email'], name='beauty_adm_inv_email_idx'),
        ]

    def __str__(self):
        return f'invite#{self.id} {self.email} as {self.role}'


class BeautyAdminAuditEvent(models.Model):
    """
    Immutable record of an admin action. Append-only — no update or delete
    API. Actor identity is snapshotted (email, role) so the row survives
    later principal deletion.
    """

    actor_user_type = models.CharField(max_length=16, blank=True, default='')
    actor_user_id = models.IntegerField(null=True, blank=True)
    actor_email = models.EmailField(blank=True, default='')
    actor_role = models.CharField(max_length=24, blank=True, default='')
    action = models.CharField(max_length=64)
    target_type = models.CharField(max_length=32, blank=True, default='')
    target_id = models.CharField(max_length=64, blank=True, default='')
    target_label = models.CharField(max_length=255, blank=True, default='')
    meta = models.JSONField(default=dict, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'beauty_admin_audit_events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['action', '-created_at'], name='beauty_adm_aud_act_idx'),
            models.Index(fields=['actor_email'], name='beauty_adm_aud_actor_idx'),
        ]

    def __str__(self):
        return f'audit#{self.id} {self.action} by {self.actor_email} @ {self.created_at:%Y-%m-%d %H:%M}'


class BeautyAdminNote(models.Model):
    """
    Internal admin note attached to a customer or business provider. Append-
    only — visible only to admin principals on the account detail screen.
    """

    TARGET_CUSTOMER = 'customer'
    TARGET_BUSINESS = 'business'
    TARGET_CHOICES = [
        (TARGET_CUSTOMER, 'Customer'),
        (TARGET_BUSINESS, 'Business Provider'),
    ]

    target_type = models.CharField(max_length=16, choices=TARGET_CHOICES)
    target_id = models.IntegerField()
    author_email = models.EmailField(blank=True, default='')
    author_user_type = models.CharField(max_length=16, blank=True, default='')
    author_user_id = models.IntegerField(null=True, blank=True)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_admin_notes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_type', 'target_id', '-created_at'], name='beauty_adm_note_tgt_idx'),
        ]

    def __str__(self):
        return f'note#{self.id} {self.target_type}:{self.target_id} by {self.author_email}'


class BeautyAdminTicket(models.Model):
    """
    Support ticket raised by a customer, provider, or system process and
    routed to an admin team member.
    """

    PRIORITY_HIGH = 'high'
    PRIORITY_MED = 'med'
    PRIORITY_LOW = 'low'
    PRIORITY_CHOICES = [
        (PRIORITY_HIGH, 'High'),
        (PRIORITY_MED, 'Medium'),
        (PRIORITY_LOW, 'Low'),
    ]

    CATEGORY_CHOICES = [
        ('refund',  'Refund'),
        ('no-show', 'No-show'),
        ('payment', 'Payment'),
        ('payouts', 'Payouts'),
        ('account', 'Account'),
        ('fraud',   'Fraud'),
        ('booking', 'Booking'),
        ('other',   'Other'),
    ]

    STATUS_NEW = 'new'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_WAITING = 'waiting'
    STATUS_RESOLVED = 'resolved'
    STATUS_CHOICES = [
        (STATUS_NEW,         'New'),
        (STATUS_IN_PROGRESS, 'In progress'),
        (STATUS_WAITING,     'Waiting on user'),
        (STATUS_RESOLVED,    'Resolved'),
    ]

    SOURCE_IN_APP = 'in_app'
    SOURCE_EMAIL = 'email'
    SOURCE_SYSTEM = 'system'
    SOURCE_CHOICES = [
        (SOURCE_IN_APP, 'In-app'),
        (SOURCE_EMAIL,  'Email'),
        (SOURCE_SYSTEM, 'System'),
    ]

    FROM_CUSTOMER = 'customer'
    FROM_BUSINESS = 'business'
    FROM_SYSTEM = 'system'

    priority = models.CharField(max_length=8, choices=PRIORITY_CHOICES, default=PRIORITY_MED)
    category = models.CharField(max_length=16, choices=CATEGORY_CHOICES, default='other')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_NEW)
    source = models.CharField(max_length=12, choices=SOURCE_CHOICES, default=SOURCE_IN_APP)
    subject = models.CharField(max_length=255)
    body = models.TextField(blank=True, default='')
    from_principal_type = models.CharField(max_length=12, blank=True, default='')
    from_principal_id = models.IntegerField(null=True, blank=True)
    from_label = models.CharField(max_length=128, blank=True, default='')
    sla_breach_at = models.DateTimeField(null=True, blank=True)
    assignee_email = models.EmailField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'beauty_admin_tickets'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at'], name='beauty_adm_ticket_st_idx'),
            models.Index(fields=['category'], name='beauty_adm_ticket_cat_idx'),
        ]

    def __str__(self):
        return f'#{self.id} {self.priority}/{self.category} {self.subject[:40]}'


class BeautyAdminTag(models.Model):
    """
    Admin-managed CRM tag. Attached to customers/providers via
    BeautyAdminTagAssignment so the same tag can apply to either kind.
    """

    slug = models.SlugField(max_length=64, unique=True)
    label = models.CharField(max_length=64)
    color = models.CharField(max_length=9)    # e.g. '#A06B2C'
    tone = models.CharField(max_length=9)     # softer fill for chip background
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_admin_tags'

    def __str__(self):
        return self.label


class BeautyAdminTagAssignment(models.Model):
    """
    Many-to-many between BeautyAdminTag and (BeautyUser | BusinessProvider).

    Uses the same ``(user_type, user_id)`` polymorphic pair as
    BeautyAdminPrincipal so a tag can be attached to either kind of
    account without a second join table.
    """

    USER_TYPE_CUSTOMER = 'customer'
    USER_TYPE_BUSINESS = 'business'
    USER_TYPE_CHOICES = [
        (USER_TYPE_CUSTOMER, 'Customer'),
        (USER_TYPE_BUSINESS, 'Business Provider'),
    ]

    tag = models.ForeignKey(BeautyAdminTag, on_delete=models.CASCADE, related_name='assignments')
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES)
    user_id = models.IntegerField()
    assigned_by_email = models.EmailField(blank=True, default='')
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_admin_tag_assignments'
        constraints = [
            models.UniqueConstraint(
                fields=['tag', 'user_type', 'user_id'],
                name='beauty_admin_tag_assignment_unique',
            ),
        ]
        indexes = [
            models.Index(fields=['user_type', 'user_id'], name='beauty_tag_assn_target_idx'),
        ]

    def __str__(self):
        return f"{self.tag.slug}:{self.user_type}:{self.user_id}"


class BeautyAuthAuditLog(models.Model):
    """
    Append-only audit trail for blocked cross-role auth attempts.

    A row is written every time the auth layer rejects a request because
    the email's stored role does not match the portal being accessed
    (e.g. a provider trying the customer login form, a customer trying
    to register on the business signup form). Same store also captures
    rate-limited (`429`) attempts so security can correlate bursts.

    Identity is recorded as a *masked* email (``a***@example.com``) so
    the log itself does not become a credential-enumeration vector.
    """

    EVENT_CROSS_ROLE_SIGNUP = 'cross_role_signup'
    EVENT_CROSS_ROLE_LOGIN = 'cross_role_login'
    EVENT_RATE_LIMITED = 'rate_limited'
    EVENT_CHOICES = [
        (EVENT_CROSS_ROLE_SIGNUP, 'Cross-role signup blocked'),
        (EVENT_CROSS_ROLE_LOGIN, 'Cross-role login blocked'),
        (EVENT_RATE_LIMITED, 'Rate limit triggered'),
    ]

    event_type = models.CharField(max_length=32, choices=EVENT_CHOICES)
    masked_email = models.CharField(max_length=255, blank=True, default='')
    request_ip = models.CharField(max_length=64, blank=True, default='')
    attempted_role = models.CharField(max_length=20, blank=True, default='')
    existing_role = models.CharField(max_length=20, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_auth_audit'
        indexes = [
            models.Index(fields=['-created_at'], name='beauty_auth_aud_at_idx'),
            models.Index(fields=['request_ip', '-created_at'], name='beauty_auth_aud_ip_idx'),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.event_type} {self.masked_email} from {self.request_ip} @ {self.created_at:%Y-%m-%d %H:%M}"


class BeautyFlagAudit(models.Model):
    """Append-only audit trail for every feature-flag change."""

    flag_key = models.CharField(max_length=64)
    old_value = models.BooleanField()
    new_value = models.BooleanField()
    changed_by_user_id = models.IntegerField(null=True, blank=True)
    changed_by_user_type = models.CharField(max_length=20, blank=True, default='')
    changed_by_email = models.CharField(max_length=255, blank=True, default='')
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_flag_audit'
        indexes = [
            models.Index(fields=['flag_key', '-changed_at'], name='beauty_flag_aud_key_idx'),
        ]
        ordering = ['-changed_at']

    def __str__(self):
        return f"{self.flag_key}: {self.old_value}->{self.new_value} @ {self.changed_at:%Y-%m-%d %H:%M}"
