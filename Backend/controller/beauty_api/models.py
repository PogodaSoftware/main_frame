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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'beauty_services'
        ordering = ['provider__name', 'name']
        indexes = [
            models.Index(fields=['category'], name='beauty_svc_cat_idx'),
            models.Index(fields=['provider', 'category'], name='beauty_svc_prov_cat_idx'),
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
    SENDER_CHOICES = [
        (SENDER_CUSTOMER, 'Customer'),
        (SENDER_BUSINESS, 'Business Provider'),
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
