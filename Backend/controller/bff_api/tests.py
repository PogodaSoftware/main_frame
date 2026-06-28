"""BFF resolver tests for the Beauty Admin Portal desktop redesign.

Each page gets a resolver unit test here. Pattern: mock the auth gate
(`get_authenticated_user` + `is_beauty_admin`) and call the resolver directly,
then assert the BFF envelope — screen key, `_links`, and real-data fields. The
matching Playwright e2e (real backend + UI) lives under `Playwright/`.

Run: docker exec main_frame-backend-1 python manage.py test bff_api
"""

from unittest import mock

from django.test import RequestFactory, TestCase
from rest_framework.test import APIRequestFactory

from datetime import datetime, timedelta, timezone

from beauty_api.middleware import SESSION_COOKIE_NAME
from beauty_api.models import (
    BeautyAdminAuditEvent,
    BeautyAdminTag,
    BeautyAdminTagAssignment,
    BeautyBooking,
    BeautyProvider,
    BeautyService,
    BeautySession,
    BeautyUser,
)
from beauty_api.admin_portal_views import AdminTagCreateView, AdminCustomerMessageView, AdminProviderMessageView
from beauty_api.admin_crm_views import CrmSuspendView
from bff_api.resolvers import beauty_admin_portal_tag_manager as tagmgr
from bff_api.resolvers import beauty_admin_portal_suspend as suspendres
from bff_api.resolvers import beauty_admin_portal_customer_detail as custres
from bff_api.resolvers import beauty_admin_portal_booking_detail as bookres
from bff_api.resolvers import beauty_admin_portal_bookings as ledgerres
from bff_api.resolvers import beauty_admin_portal_provider_detail as provres
from bff_api.resolvers import beauty_admin_portal_tickets as ticketsres
from bff_api.resolvers import beauty_admin_portal_team as teamres
from bff_api.resolvers import beauty_admin_portal_audit as auditres
from bff_api.resolvers import beauty_admin_portal_dashboard as dashres
from bff_api.resolvers import beauty_admin_portal_2fa as twofares
from bff_api.resolvers import beauty_admin_portal_magic as magicres
from bff_api.resolvers import beauty_profile as profileres
from bff_api.resolvers import beauty_bookings as bookingsres
from bff_api.resolvers import beauty_book as bookres_customer
from bff_api.resolvers import beauty_business_home as bizhomeres
from bff_api import views as bff_views
from beauty_api.models import BusinessProvider, BeautyAdminTicket, BeautyAdminPrincipal


_ADMIN_USER = {"user_type": "customer", "user_id": 759, "email": "adminview@beauty-test.com"}


# ---------------------------------------------------------------------------
# Page 4 — Tag manager resolver  (beauty_admin_portal_tag_manager)
# ---------------------------------------------------------------------------
class TagManagerResolverTests(TestCase):
    def setUp(self):
        self.rf = RequestFactory()

    def _request(self):
        req = self.rf.get("/api/bff/beauty/resolve/")
        req.COOKIES[SESSION_COOKIE_NAME] = "fake-session-cookie"
        return req

    def test_non_admin_is_redirected_to_signin(self):
        """No authenticated principal → redirect envelope, never the tag screen."""
        with mock.patch.object(tagmgr, "get_authenticated_user", return_value=None):
            resp = tagmgr.resolve(self._request(), "beauty_admin_portal_tag_manager", "dev-1")
        self.assertEqual(resp.get("action"), "redirect")
        self.assertEqual(resp["_links"]["target"]["screen"], "beauty_admin_portal_signin")

    def test_authenticated_non_allowlisted_is_redirected(self):
        """Authenticated but not an admin principal → still redirected."""
        with mock.patch.object(tagmgr, "get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch.object(tagmgr.h, "is_beauty_admin", return_value=False):
            resp = tagmgr.resolve(self._request(), "beauty_admin_portal_tag_manager", "dev-1")
        self.assertEqual(resp.get("action"), "redirect")

    def test_admin_render_seeds_defaults_and_exposes_create_link(self):
        """Admin with an empty tag table → defaults seeded + a real create POST link."""
        self.assertFalse(BeautyAdminTag.objects.exists())
        with mock.patch.object(tagmgr, "get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch.object(tagmgr.h, "is_beauty_admin", return_value=True):
            resp = tagmgr.resolve(self._request(), "beauty_admin_portal_tag_manager", "dev-1")

        self.assertEqual(resp["action"], "render")
        self.assertEqual(resp["screen"], "beauty_admin_portal_tag_manager")

        # Real-data: defaults were seeded and surfaced.
        self.assertTrue(BeautyAdminTag.objects.exists())
        tags = resp["data"]["tags"]
        self.assertGreater(len(tags), 0)
        for t in tags:
            self.assertEqual(set(t.keys()), {"id", "label", "color", "tone", "count"})

        # Create link is a real POST to the tag endpoint the view backs.
        create = resp["_links"]["create"]
        self.assertEqual(create["method"], "POST")
        self.assertEqual(create["href"], "/api/beauty/admin/portal/tags/")
        # Navigation links present.
        self.assertIn("crm", resp["_links"])
        self.assertIn("close", resp["_links"])

    def test_count_reflects_real_assignments(self):
        """The `count` column is the live BeautyAdminTagAssignment count, not a fixture."""
        tag = BeautyAdminTag.objects.create(slug="vip", label="VIP", color="#A06B2C", tone="#F4E7D6")
        BeautyAdminTagAssignment.objects.create(tag=tag, user_type="customer", user_id=11, assigned_by_email="a@b.io")
        BeautyAdminTagAssignment.objects.create(tag=tag, user_type="customer", user_id=12, assigned_by_email="a@b.io")

        with mock.patch.object(tagmgr, "get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch.object(tagmgr.h, "is_beauty_admin", return_value=True):
            resp = tagmgr.resolve(self._request(), "beauty_admin_portal_tag_manager", "dev-1")

        vip = next(t for t in resp["data"]["tags"] if t["id"] == "vip")
        self.assertEqual(vip["count"], 2)


# ---------------------------------------------------------------------------
# Page 4 — Tag create endpoint  (AdminTagCreateView → BeautyAdminTag + audit)
# ---------------------------------------------------------------------------
class TagCreateViewTests(TestCase):
    def setUp(self):
        self.rf = APIRequestFactory()

    def _post(self, body):
        req = self.rf.post("/api/beauty/admin/portal/tags/", body, format="json",
                           HTTP_X_DEVICE_ID="dev-1")
        req.COOKIES[SESSION_COOKIE_NAME] = "fake-session-cookie"
        return req

    def test_create_persists_row_and_writes_audit_event(self):
        view = AdminTagCreateView.as_view()
        with mock.patch("beauty_api.admin_portal_views.get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch("beauty_api.admin_portal_views.is_beauty_admin", return_value=True):
            resp = view(self._post({"label": "Press / PR", "color": "#0F1115", "tone": "#E9E9EB"}))

        self.assertEqual(resp.status_code, 201)
        # Real row created with a slug derived from the label.
        tag = BeautyAdminTag.objects.get(label="Press / PR")
        self.assertEqual(tag.color, "#0F1115")
        self.assertEqual(resp.data["slug"], tag.slug)
        # Audit event recorded.
        self.assertTrue(
            BeautyAdminAuditEvent.objects.filter(action="tag.create", target_id=str(tag.id)).exists()
        )

    def test_create_rejects_empty_label(self):
        view = AdminTagCreateView.as_view()
        with mock.patch("beauty_api.admin_portal_views.get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch("beauty_api.admin_portal_views.is_beauty_admin", return_value=True):
            resp = view(self._post({"label": "  ", "color": "#0F1115"}))
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(BeautyAdminTag.objects.exists())


# ---------------------------------------------------------------------------
# Page 5 — Suspend confirm resolver  (beauty_admin_portal_suspend)
# ---------------------------------------------------------------------------
class SuspendResolverTests(TestCase):
    def setUp(self):
        self.rf = RequestFactory()
        self.target = BeautyUser.objects.create(email="sara.liu@beauty-test.com", password="x")

    def _request(self):
        req = self.rf.get("/api/bff/beauty/resolve/")
        req.COOKIES[SESSION_COOKIE_NAME] = "fake-session-cookie"
        return req

    def test_non_admin_is_redirected(self):
        with mock.patch.object(suspendres, "get_authenticated_user", return_value=None):
            resp = suspendres.resolve(self._request(), "beauty_admin_portal_suspend", "dev-1",
                                      {"type": "customer", "id": self.target.id})
        self.assertEqual(resp.get("action"), "redirect")

    def test_render_supplies_real_name_direction_and_submit_link(self):
        with mock.patch.object(suspendres, "get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch.object(suspendres.h, "is_beauty_admin", return_value=True):
            resp = suspendres.resolve(self._request(), "beauty_admin_portal_suspend", "dev-1",
                                      {"type": "customer", "id": self.target.id})

        self.assertEqual(resp["action"], "render")
        self.assertEqual(resp["screen"], "beauty_admin_portal_suspend")
        data = resp["data"]
        self.assertEqual(data["kind"], "customer")
        self.assertEqual(data["id"], self.target.id)
        self.assertEqual(data["name"], "Sara Liu")            # derived from real email
        self.assertFalse(data["is_currently_suspended"])
        self.assertTrue(data["default_reason"])               # suspend default reason supplied
        # The submit link is a real POST to the suspend endpoint the view backs.
        submit = resp["_links"]["submit"]
        self.assertEqual(submit["method"], "POST")
        self.assertEqual(submit["href"], "/api/beauty/admin/crm/suspend/")
        self.assertIn("close", resp["_links"])

    def test_reinstate_direction_has_no_default_reason(self):
        self.target.is_suspended = True
        self.target.save(update_fields=["is_suspended"])
        with mock.patch.object(suspendres, "get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch.object(suspendres.h, "is_beauty_admin", return_value=True):
            resp = suspendres.resolve(self._request(), "beauty_admin_portal_suspend", "dev-1",
                                      {"type": "customer", "id": self.target.id})
        self.assertTrue(resp["data"]["is_currently_suspended"])
        self.assertEqual(resp["data"]["default_reason"], "")  # reinstate note is optional


# ---------------------------------------------------------------------------
# Page 5 — Suspend endpoint  (CrmSuspendView → suspend + kill sessions + audit)
# ---------------------------------------------------------------------------
class CrmSuspendViewTests(TestCase):
    def setUp(self):
        self.rf = APIRequestFactory()
        self.target = BeautyUser.objects.create(email="victim@beauty-test.com", password="x")
        # An active session that the suspend must invalidate.
        self.session = BeautySession.objects.create(
            user_id=self.target.id, user_type=BeautySession.USER_TYPE_CUSTOMER,
            device_id="dev-victim", token_hash="victim-token-hash",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1), is_active=True,
        )

    def _post(self, body):
        req = self.rf.post("/api/beauty/admin/crm/suspend/", body, format="json", HTTP_X_DEVICE_ID="dev-1")
        req.COOKIES[SESSION_COOKIE_NAME] = "fake-session-cookie"
        return req

    def test_suspend_sets_flag_kills_sessions_and_audits(self):
        view = CrmSuspendView.as_view()
        with mock.patch("beauty_api.admin_crm_views.get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch("beauty_api.admin_crm_views.is_beauty_admin", return_value=True):
            resp = view(self._post({"type": "customer", "id": self.target.id,
                                    "suspended": True, "reason": "Repeat chargebacks."}))

        self.assertEqual(resp.status_code, 200)
        self.target.refresh_from_db()
        self.session.refresh_from_db()
        self.assertTrue(self.target.is_suspended)
        self.assertFalse(self.session.is_active)              # signed out across devices
        self.assertTrue(
            BeautyAdminAuditEvent.objects.filter(action="account.suspend",
                                                 target_id=str(self.target.id)).exists()
        )


# ---------------------------------------------------------------------------
# Page 6 — Customer detail resolver  (beauty_admin_portal_customer_detail)
# ---------------------------------------------------------------------------
class CustomerDetailResolverTests(TestCase):
    def setUp(self):
        self.rf = RequestFactory()
        self.target = BeautyUser.objects.create(email="aisha.bell@beauty-test.com", password="x")
        self.tag = BeautyAdminTag.objects.create(slug="vip", label="VIP", color="#A06B2C", tone="#F4E7D6")
        BeautyAdminTagAssignment.objects.create(tag=self.tag, user_type="customer",
                                                user_id=self.target.id, assigned_by_email="a@b.io")

    def _request(self):
        req = self.rf.get("/api/bff/beauty/resolve/")
        req.COOKIES[SESSION_COOKIE_NAME] = "fake-session-cookie"
        return req

    def _render(self):
        with mock.patch.object(custres, "get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch.object(custres.h, "is_beauty_admin", return_value=True):
            return custres.resolve(self._request(), "beauty_admin_portal_customer_detail", "dev-1",
                                   {"id": self.target.id})

    def test_non_admin_is_redirected(self):
        with mock.patch.object(custres, "get_authenticated_user", return_value=None):
            resp = custres.resolve(self._request(), "beauty_admin_portal_customer_detail", "dev-1",
                                   {"id": self.target.id})
        self.assertEqual(resp.get("action"), "redirect")

    def test_unknown_customer_redirects_to_crm(self):
        with mock.patch.object(custres, "get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch.object(custres.h, "is_beauty_admin", return_value=True):
            resp = custres.resolve(self._request(), "beauty_admin_portal_customer_detail", "dev-1", {"id": 99999})
        self.assertEqual(resp.get("action"), "redirect")

    def test_render_exposes_real_identity_and_tags(self):
        resp = self._render()
        self.assertEqual(resp["action"], "render")
        self.assertEqual(resp["screen"], "beauty_admin_portal_customer_detail")
        data = resp["data"]
        self.assertEqual(data["id"], self.target.id)
        self.assertEqual(data["display_name"], "Aisha Bell")       # derived from real email
        self.assertEqual(data["email"], self.target.email)
        # Attached tag is the real assignment; it is excluded from suggestions.
        self.assertEqual([t["id"] for t in data["attached_tags"]], ["vip"])
        self.assertNotIn("vip", [t["id"] for t in data["suggested_tags"]])
        # Lifetime stats are present and labelled (real aggregates, zero here).
        labels = [s["label"] for s in data["lifetime_stats"]]
        self.assertIn("Bookings", labels)
        self.assertIn("Spent", labels)

    def test_render_exposes_real_action_links(self):
        links = self._render()["_links"]
        # Destructive + write actions wired to real endpoints.
        self.assertEqual(links["note"]["method"], "POST")
        self.assertTrue(links["note"]["href"].endswith(f"/customer/{self.target.id}/note/"))
        self.assertEqual(links["message"]["method"], "POST")
        self.assertEqual(links["export"]["method"], "GET")
        self.assertEqual(links["suspend"]["screen"], "beauty_admin_portal_suspend")
        # Inline tag assign/unassign templates (RN-parity actions the web wires).
        self.assertIn(":slug", links["tag_assign_template"]["href"])
        self.assertEqual(links["tag_unassign_template"]["method"], "DELETE")

    def test_available_tags_returns_all_unattached_no_cap(self):
        # Seed 6 extra tags (7 total, 1 already attached in setUp).
        slugs = ["bold", "chic", "elite", "fresh", "golden", "hype"]
        for slug in slugs:
            BeautyAdminTag.objects.create(slug=slug, label=slug.title(), color="#111111", tone="#222222")
        data = self._render()["data"]
        # suggested_tags must stay capped at 4.
        self.assertEqual(len(data["suggested_tags"]), 4)
        # available_tags must include ALL 6 unattached tags (no cap).
        available_ids = [t["id"] for t in data["available_tags"]]
        self.assertGreater(len(available_ids), 4)
        self.assertEqual(len(available_ids), 6)  # 7 total − 1 attached
        # The attached tag must be absent from available_tags.
        self.assertNotIn("vip", available_ids)
        # Shape check: every item has the four expected keys.
        for item in data["available_tags"]:
            self.assertIn("id", item)
            self.assertIn("label", item)
            self.assertIn("color", item)
            self.assertIn("tone", item)
        # available_tags must be ordered by label.
        labels = [t["label"] for t in data["available_tags"]]
        self.assertEqual(labels, sorted(labels))


# ---------------------------------------------------------------------------
# Booking detail resolver  (beauty_admin_portal_booking_detail) — guards
# ---------------------------------------------------------------------------
class BookingDetailResolverTests(TestCase):
    def setUp(self):
        self.rf = RequestFactory()

    def _request(self):
        req = self.rf.get("/api/bff/beauty/resolve/")
        req.COOKIES[SESSION_COOKIE_NAME] = "fake-session-cookie"
        return req

    def test_non_admin_is_redirected(self):
        with mock.patch.object(bookres, "get_authenticated_user", return_value=None):
            resp = bookres.resolve(self._request(), "beauty_admin_portal_booking_detail", "dev-1", {"id": 1})
        self.assertEqual(resp.get("action"), "redirect")

    def test_unknown_booking_redirects_to_ledger(self):
        with mock.patch.object(bookres, "get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch.object(bookres.h, "is_beauty_admin", return_value=True):
            resp = bookres.resolve(self._request(), "beauty_admin_portal_booking_detail", "dev-1", {"id": 99999})
        self.assertEqual(resp.get("action"), "redirect")
        self.assertEqual(resp["_links"]["target"]["screen"], "beauty_admin_portal_bookings")

    def test_confirmation_format(self):
        self.assertEqual(bookres._confirmation(133), "BK-0000-0085")


# ---------------------------------------------------------------------------
# Page 8 — Bookings ledger resolver  (beauty_admin_portal_bookings)
# ---------------------------------------------------------------------------
class BookingsLedgerResolverTests(TestCase):
    def setUp(self):
        self.rf = RequestFactory()

    def _request(self):
        req = self.rf.get("/api/bff/beauty/resolve/")
        req.COOKIES[SESSION_COOKIE_NAME] = "fake-session-cookie"
        return req

    def _render(self, params=None):
        with mock.patch.object(ledgerres, "get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch.object(ledgerres.h, "is_beauty_admin", return_value=True):
            return ledgerres.resolve(self._request(), "beauty_admin_portal_bookings", "dev-1", params or {})

    def test_non_admin_is_redirected(self):
        with mock.patch.object(ledgerres, "get_authenticated_user", return_value=None):
            resp = ledgerres.resolve(self._request(), "beauty_admin_portal_bookings", "dev-1")
        self.assertEqual(resp.get("action"), "redirect")

    def test_render_exposes_status_buckets_sort_and_detail_link(self):
        resp = self._render()
        self.assertEqual(resp["action"], "render")
        self.assertEqual(resp["screen"], "beauty_admin_portal_bookings")
        data = resp["data"]
        # The six real status buckets (no fabricated "Disputed").
        bucket_ids = [b["id"] for b in data["status_buckets"]]
        self.assertEqual(bucket_ids, ["All", "Upcoming", "Pending", "Past", "Cancelled", "Refunded"])
        self.assertTrue(data["sort_options"])
        self.assertIn("gmv_label", data)
        # Rows open the ADMIN booking detail (never the customer-facing screen).
        self.assertEqual(resp["_links"]["booking_detail"]["screen"], "beauty_admin_portal_booking_detail")

    def test_status_filter_param_is_echoed(self):
        data = self._render({"status": "cancelled"})["data"]
        self.assertEqual(data["active_status"], "Cancelled")


# ---------------------------------------------------------------------------
# Page 7 — Provider detail resolver  (beauty_admin_portal_provider_detail)
# ---------------------------------------------------------------------------
class ProviderDetailResolverTests(TestCase):
    def setUp(self):
        self.rf = RequestFactory()
        self.bp = BusinessProvider.objects.create(
            email="indigo@beauty-test.com", password="x", business_name="Indigo Studio")

    def _request(self):
        req = self.rf.get("/api/bff/beauty/resolve/")
        req.COOKIES[SESSION_COOKIE_NAME] = "fake-session-cookie"
        return req

    def _render(self):
        with mock.patch.object(provres, "get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch.object(provres.h, "is_beauty_admin", return_value=True):
            return provres.resolve(self._request(), "beauty_admin_portal_provider_detail", "dev-1", {"id": self.bp.id})

    def test_non_admin_is_redirected(self):
        with mock.patch.object(provres, "get_authenticated_user", return_value=None):
            resp = provres.resolve(self._request(), "beauty_admin_portal_provider_detail", "dev-1", {"id": self.bp.id})
        self.assertEqual(resp.get("action"), "redirect")

    def test_unknown_provider_redirects_to_crm(self):
        with mock.patch.object(provres, "get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch.object(provres.h, "is_beauty_admin", return_value=True):
            resp = provres.resolve(self._request(), "beauty_admin_portal_provider_detail", "dev-1", {"id": 99999})
        self.assertEqual(resp.get("action"), "redirect")

    def test_render_exposes_identity_performance_and_links(self):
        resp = self._render()
        self.assertEqual(resp["action"], "render")
        self.assertEqual(resp["screen"], "beauty_admin_portal_provider_detail")
        data = resp["data"]
        self.assertEqual(data["business_name"], "Indigo Studio")
        # Performance card labels (real aggregates).
        labels = [s["label"] for s in data["performance"]]
        self.assertEqual(labels, ["Earned", "Bookings", "Rating", "Cancel rate"])
        # Suspend link targets the business account; tag templates use type=business.
        self.assertEqual(resp["_links"]["suspend"]["params"]["type"], "business")
        self.assertIn("type=business", resp["_links"]["tag_unassign_template"]["href"])
        self.assertEqual(resp["_links"]["note"]["method"], "POST")

    def test_available_tags_returns_all_unattached_no_cap(self):
        # Attach one tag to this provider so it is excluded.
        attached_tag = BeautyAdminTag.objects.create(
            slug="prov-vip", label="Prov VIP", color="#A06B2C", tone="#F4E7D6")
        BeautyAdminTagAssignment.objects.create(
            tag=attached_tag, user_type="business",
            user_id=self.bp.id, assigned_by_email="a@b.io")
        # Seed 6 more unattached tags (7 total, 1 attached).
        slugs = ["artisan", "boutique", "classic", "deluxe", "elevated", "flagship"]
        for slug in slugs:
            BeautyAdminTag.objects.create(slug=slug, label=slug.title(), color="#333333", tone="#444444")
        data = self._render()["data"]
        # suggested_tags must stay capped at 4.
        self.assertEqual(len(data["suggested_tags"]), 4)
        # available_tags must include ALL 6 unattached tags (no cap).
        available_ids = [t["id"] for t in data["available_tags"]]
        self.assertGreater(len(available_ids), 4)
        self.assertEqual(len(available_ids), 6)  # 7 total − 1 attached
        # The attached tag must be absent from available_tags.
        self.assertNotIn("prov-vip", available_ids)
        # Shape check: every item has the four expected keys.
        for item in data["available_tags"]:
            self.assertIn("id", item)
            self.assertIn("label", item)
            self.assertIn("color", item)
            self.assertIn("tone", item)
        # available_tags must be ordered by label.
        labels = [t["label"] for t in data["available_tags"]]
        self.assertEqual(labels, sorted(labels))


# ---------------------------------------------------------------------------
# Page 9 — Support tickets resolver  (beauty_admin_portal_tickets)
# ---------------------------------------------------------------------------
class TicketsResolverTests(TestCase):
    def setUp(self):
        self.rf = RequestFactory()
        # Two open tickets: one assigned to the admin, one unassigned.
        BeautyAdminTicket.objects.create(
            priority="high", category="refund", status="in_progress",
            source="in_app", subject="Refund not received",
            assignee_email="adminview@beauty-test.com")
        BeautyAdminTicket.objects.create(
            priority="high", category="refund", status="new",
            source="email", subject="Refund request — booking cancelled")
        # One resolved ticket (excluded from the default open view).
        BeautyAdminTicket.objects.create(
            priority="low", category="account", status="resolved",
            source="system", subject="Password reset")

    def _request(self):
        req = self.rf.get("/api/bff/beauty/resolve/")
        req.COOKIES[SESSION_COOKIE_NAME] = "fake-session-cookie"
        return req

    def _render(self, params=None):
        with mock.patch.object(ticketsres, "get_authenticated_user", return_value=_ADMIN_USER), \
                mock.patch.object(ticketsres.h, "is_beauty_admin", return_value=True):
            return ticketsres.resolve(self._request(), "beauty_admin_portal_tickets", "dev-1", params or {})

    def test_non_admin_is_redirected(self):
        with mock.patch.object(ticketsres, "get_authenticated_user", return_value=None):
            resp = ticketsres.resolve(self._request(), "beauty_admin_portal_tickets", "dev-1")
        self.assertEqual(resp.get("action"), "redirect")

    def test_render_exposes_buckets_rubric_and_real_action_links(self):
        resp = self._render()
        self.assertEqual(resp["action"], "render")
        self.assertEqual(resp["screen"], "beauty_admin_portal_tickets")
        data = resp["data"]
        # Default open view excludes the resolved ticket.
        self.assertEqual(data["open_count"], 2)
        self.assertEqual(len(data["rows"]), 2)
        # Real status buckets + category rubric with live counts.
        bucket_ids = [b["id"] for b in data["status_buckets"]]
        self.assertEqual(bucket_ids, ["open", "mine", "sla", "unassigned", "waiting", "resolved"])
        refund = next(c for c in data["category_rubric"] if c["id"] == "refund")
        self.assertEqual(refund["count"], 2)
        self.assertTrue(data["sort_options"])
        # Real write links: create (POST) + :id-templated assign/status.
        self.assertEqual(resp["_links"]["create"]["method"], "POST")
        self.assertIn(":id", resp["_links"]["assign_template"]["href"])
        self.assertIn(":id", resp["_links"]["status_template"]["href"])

    def test_mine_filter_returns_only_admin_assigned(self):
        data = self._render({"status": "mine"})["data"]
        self.assertEqual(data["active_status"], "mine")
        self.assertEqual(len(data["rows"]), 1)
        self.assertEqual(data["rows"][0]["assignee_email"], "adminview@beauty-test.com")

    def test_category_filter_is_echoed_and_applied(self):
        data = self._render({"cat": "account"})["data"]
        self.assertEqual(data["active_category"], "account")
        # 'account' has no OPEN ticket (the only account ticket is resolved).
        self.assertEqual(len(data["rows"]), 0)


# ---------------------------------------------------------------------------
# Page 10 — Team & access resolver  (beauty_admin_portal_team)
# ---------------------------------------------------------------------------
class TeamResolverTests(TestCase):
    def setUp(self):
        self.rf = RequestFactory()
        # The signed-in admin (an owner) + one revocable support agent.
        self.owner = BeautyUser.objects.create(email="owner@beauty-test.com", password="x")
        self.agent = BeautyUser.objects.create(email="agent@beauty-test.com", password="x")
        BeautyAdminPrincipal.objects.create(user_type="customer", user_id=self.owner.id, role="owner")
        self.agent_principal = BeautyAdminPrincipal.objects.create(
            user_type="customer", user_id=self.agent.id, role="support_agent")
        self.me = {"user_type": "customer", "user_id": self.owner.id, "email": self.owner.email}

    def _request(self):
        req = self.rf.get("/api/bff/beauty/resolve/")
        req.COOKIES[SESSION_COOKIE_NAME] = "fake-session-cookie"
        return req

    def _render(self, user=None):
        with mock.patch.object(teamres, "get_authenticated_user", return_value=user or self.me), \
                mock.patch.object(teamres.h, "is_beauty_admin", return_value=True):
            return teamres.resolve(self._request(), "beauty_admin_portal_team", "dev-1", {})

    def test_non_admin_is_redirected(self):
        with mock.patch.object(teamres, "get_authenticated_user", return_value=None):
            resp = teamres.resolve(self._request(), "beauty_admin_portal_team", "dev-1")
        self.assertEqual(resp.get("action"), "redirect")

    def test_render_exposes_roster_matrix_and_owner_action_links(self):
        resp = self._render()
        self.assertEqual(resp["action"], "render")
        self.assertEqual(resp["screen"], "beauty_admin_portal_team")
        data = resp["data"]
        self.assertTrue(data["is_owner"])
        self.assertEqual(data["totals"]["admins"], 2)
        self.assertEqual(data["totals"]["owners"], 1)
        # Real static permission matrix (4 roles x 13 permissions).
        self.assertEqual(len(data["permission_matrix"]["rows"]), 13)
        self.assertEqual(len(data["role_options"]), 4)
        # Real write links: invite (POST) + :id-templated role (PATCH) / revoke (DELETE).
        self.assertEqual(resp["_links"]["invite"]["method"], "POST")
        self.assertEqual(resp["_links"]["role_template"]["method"], "PATCH")
        self.assertIn(":id", resp["_links"]["role_template"]["href"])
        self.assertEqual(resp["_links"]["revoke_template"]["method"], "DELETE")
        self.assertIn(":id", resp["_links"]["revoke_template"]["href"])

    def test_non_owner_sees_is_owner_false(self):
        non_owner = {"user_type": "customer", "user_id": self.agent.id, "email": self.agent.email}
        data = self._render(user=non_owner)["data"]
        self.assertFalse(data["is_owner"])


# ---------------------------------------------------------------------------
# Page 11 — Audit log resolver  (beauty_admin_portal_audit)
# ---------------------------------------------------------------------------
class AuditResolverTests(TestCase):
    def setUp(self):
        self.rf = RequestFactory()
        # Row 1: team.revoke with a reason in meta — exercises reason column + meta exclusion.
        BeautyAdminAuditEvent.objects.create(
            action='team.revoke',
            actor_email='maria.santos@beauty.io',
            actor_role='owner',
            target_type='admin_principal',
            target_id='42',
            target_label='Bob Tester',
            ip='203.0.113.5',
            meta={'reason': 'Policy violation', 'note': 'Confirmed by legal'},
        )
        # Row 2: tag.create — no reason, no ip, no target_label.
        BeautyAdminAuditEvent.objects.create(
            action='tag.create',
            actor_email='j.smith@beauty.io',
            actor_role='support_lead',
            target_type='tag',
            target_id='vip',
            target_label='',
            ip='',
            meta={},
        )

    def _request(self):
        req = self.rf.get('/api/bff/beauty/resolve/')
        req.COOKIES[SESSION_COOKIE_NAME] = 'fake-session-cookie'
        return req

    def _render(self, params=None):
        with mock.patch.object(auditres, 'get_authenticated_user', return_value=_ADMIN_USER), \
                mock.patch.object(auditres.h, 'is_beauty_admin', return_value=True):
            return auditres.resolve(
                self._request(), 'beauty_admin_portal_audit', 'dev-1', params or {}
            )

    # (a) non-admin → redirect envelope
    def test_non_admin_is_redirected(self):
        with mock.patch.object(auditres, 'get_authenticated_user', return_value=None):
            resp = auditres.resolve(self._request(), 'beauty_admin_portal_audit', 'dev-1')
        self.assertEqual(resp.get('action'), 'redirect')
        self.assertEqual(resp['_links']['target']['screen'], 'beauty_admin_portal_signin')

    def test_authenticated_non_allowlisted_is_redirected(self):
        with mock.patch.object(auditres, 'get_authenticated_user', return_value=_ADMIN_USER), \
                mock.patch.object(auditres.h, 'is_beauty_admin', return_value=False):
            resp = auditres.resolve(self._request(), 'beauty_admin_portal_audit', 'dev-1')
        self.assertEqual(resp.get('action'), 'redirect')

    # (b) render exposes rows with new columnar fields + action_values + total
    def test_render_exposes_columnar_fields_and_totals(self):
        resp = self._render()
        self.assertEqual(resp['action'], 'render')
        self.assertEqual(resp['screen'], 'beauty_admin_portal_audit')
        data = resp['data']

        self.assertEqual(data['total'], 2)
        self.assertIn('page_size', data)
        self.assertIn('action_values', data)
        # Both action codes appear in the distinct filter list.
        self.assertIn('team.revoke', data['action_values'])
        self.assertIn('tag.create', data['action_values'])

        rows = data['rows']
        self.assertEqual(len(rows), 2)

        # Locate the team.revoke row (newest first, so index 0).
        revoke = next(r for r in rows if r['action'] == 'team.revoke')

        # ── New columnar fields ──────────────────────────────────────────────
        self.assertEqual(revoke['actor_initials'], 'MS')        # maria.santos → M + S
        self.assertEqual(revoke['actor_role'], 'owner')
        self.assertEqual(revoke['target_label'], 'Bob Tester')  # target_label wins
        self.assertEqual(revoke['reason'], 'Policy violation')  # pulled from meta['reason']
        self.assertEqual(revoke['ip'], '203.0.113.5')

        # ── Backward-compat fields still present ────────────────────────────
        self.assertIn('title_html', revoke)
        self.assertIn('meta', revoke)
        self.assertIn('when_label', revoke)
        self.assertIn('when_iso', revoke)
        self.assertIn('icon', revoke)
        self.assertIn('color', revoke)
        self.assertIn('actor_email', revoke)

        # reason must NOT appear inside the meta blob (no double-printing).
        self.assertNotIn('reason', revoke['meta'])

        # tag.create row — empty reason + ip fallback to empty string.
        tag_row = next(r for r in rows if r['action'] == 'tag.create')
        self.assertEqual(tag_row['actor_initials'], 'JS')       # j.smith → J + S
        self.assertEqual(tag_row['reason'], '')
        self.assertEqual(tag_row['ip'], '')
        # target_label falls back to target_id when target_label is blank.
        self.assertEqual(tag_row['target_label'], 'vip')

    # (c) action filter param narrows the rows
    def test_action_filter_narrows_rows(self):
        data = self._render({'action': 'team.revoke'})['data']
        self.assertEqual(len(data['rows']), 1)
        self.assertEqual(data['rows'][0]['action'], 'team.revoke')
        self.assertEqual(data['filters']['action'], 'team.revoke')

    def test_action_filter_returns_empty_for_no_match(self):
        data = self._render({'action': 'account.suspend'})['data']
        self.assertEqual(len(data['rows']), 0)
        self.assertEqual(data['total'], 0)

    def test_actor_initials_edge_cases_always_two_chars(self):
        # Single-character local part must still yield a 2-char badge (not 1).
        BeautyAdminAuditEvent.objects.create(
            action='note.create', actor_email='a@beauty.io', actor_role='', target_label='x')
        # Empty actor email falls back to 'AA'.
        BeautyAdminAuditEvent.objects.create(
            action='note.create', actor_email='', actor_role='', target_label='y')
        rows = self._render({'action': 'note.create'})['data']['rows']
        inits = {r['actor_email']: r['actor_initials'] for r in rows}
        self.assertEqual(inits['a@beauty.io'], 'AA')   # 'a' padded to two chars
        self.assertEqual(inits[''], 'AA')              # empty → 'AA'
        for v in inits.values():
            self.assertEqual(len(v), 2)


# ---------------------------------------------------------------------------
# Admin in-app messaging  (AdminCustomerMessageView / AdminProviderMessageView)
# Tests: broadened booking gate, WS broadcast, 409 when no messageable thread.
# ---------------------------------------------------------------------------

def _make_booking_fixture(*, customer, bp, status='booked', slot_offset_hours=-1,
                           duration_minutes=60):
    """Create the minimal BeautyProvider → BeautyService → BeautyBooking chain.

    ``slot_offset_hours`` is relative to now so we can place the booking in the
    past (negative) or future (positive).  A booking that ended within the last
    24 h will still pass ``is_chat_active``; one that ended > 24 h ago will not.
    """
    provider = BeautyProvider.objects.create(
        name='Test Salon', business_provider_id=bp.id,
    )
    service = BeautyService.objects.create(
        provider=provider, name='Cut', category='hair',
        price_cents=5000, duration_minutes=duration_minutes,
    )
    slot = datetime.now(timezone.utc) + timedelta(hours=slot_offset_hours)
    booking = BeautyBooking.objects.create(
        customer=customer,
        service=service,
        slot_at=slot,
        status=status,
        service_name_at_booking='Cut',
        service_price_cents_at_booking=5000,
        service_duration_minutes_at_booking=duration_minutes,
    )
    return booking


class AdminMessageGateTests(TestCase):
    """AdminCustomerMessageView / AdminProviderMessageView — booking gate + broadcast."""

    def setUp(self):
        self.rf = APIRequestFactory()
        self.customer = BeautyUser.objects.create(
            email='msg-cust@beauty-test.com', password='x')
        self.bp = BusinessProvider.objects.create(
            email='msg-biz@beauty-test.com', password='x', business_name='Msg Salon')

    def _post_customer(self, body):
        req = self.rf.post(
            f'/api/beauty/admin/portal/customer/{self.customer.id}/message/',
            body, format='json', HTTP_X_DEVICE_ID='dev-1',
        )
        req.COOKIES[SESSION_COOKIE_NAME] = 'fake-session-cookie'
        return req

    def _post_provider(self, body):
        req = self.rf.post(
            f'/api/beauty/admin/portal/business/{self.bp.id}/message/',
            body, format='json', HTTP_X_DEVICE_ID='dev-1',
        )
        req.COOKIES[SESSION_COOKIE_NAME] = 'fake-session-cookie'
        return req

    # ------------------------------------------------------------------
    # (1) completed-within-window booking → 201 + creates BeautyChatMessage
    #     + writes message.send audit event
    # ------------------------------------------------------------------
    def test_message_into_completed_within_window_booking_succeeds(self):
        """Admin can message into a completed booking that is still within 24h."""
        # Booking completed 30 minutes ago; service duration 60 min so
        # chat window closes at slot_at + 60m + 24h = ~24.5h from now — still open.
        _make_booking_fixture(
            customer=self.customer, bp=self.bp,
            status='completed',
            slot_offset_hours=-1,   # started 1h ago
            duration_minutes=60,    # ended ~now → well within 24h window
        )
        view = AdminCustomerMessageView.as_view()
        with mock.patch('beauty_api.admin_portal_views.get_authenticated_user',
                        return_value=_ADMIN_USER), \
             mock.patch('beauty_api.admin_portal_views.is_beauty_admin',
                        return_value=True), \
             mock.patch('beauty_api.admin_portal_views._broadcast_message'):
            resp = view(self._post_customer({'body': 'Hello from admin'}),
                        customer_id=self.customer.id)

        self.assertEqual(resp.status_code, 201)
        # BeautyChatMessage persisted with sender_type='admin'.
        from beauty_api.models import BeautyChatMessage, BeautyAdminAuditEvent
        msg = BeautyChatMessage.objects.filter(sender_type='admin').first()
        self.assertIsNotNone(msg)
        self.assertEqual(msg.body, 'Hello from admin')
        # Audit event written.
        self.assertTrue(
            BeautyAdminAuditEvent.objects.filter(action='message.send').exists()
        )

    # ------------------------------------------------------------------
    # (2) No messageable booking → 409
    # ------------------------------------------------------------------
    def test_message_with_no_messageable_booking_returns_409(self):
        """No booking at all → 409 Conflict."""
        view = AdminCustomerMessageView.as_view()
        with mock.patch('beauty_api.admin_portal_views.get_authenticated_user',
                        return_value=_ADMIN_USER), \
             mock.patch('beauty_api.admin_portal_views.is_beauty_admin',
                        return_value=True):
            resp = view(self._post_customer({'body': 'Hello'}),
                        customer_id=self.customer.id)
        self.assertEqual(resp.status_code, 409)

    def test_message_with_only_cancelled_booking_returns_409(self):
        """Only a cancelled booking → 409 (cancelled bookings have no chat thread)."""
        _make_booking_fixture(
            customer=self.customer, bp=self.bp,
            status='cancelled_by_customer',
            slot_offset_hours=-1,
        )
        view = AdminCustomerMessageView.as_view()
        with mock.patch('beauty_api.admin_portal_views.get_authenticated_user',
                        return_value=_ADMIN_USER), \
             mock.patch('beauty_api.admin_portal_views.is_beauty_admin',
                        return_value=True):
            resp = view(self._post_customer({'body': 'Hello'}),
                        customer_id=self.customer.id)
        self.assertEqual(resp.status_code, 409)

    def test_message_with_expired_window_booking_returns_409(self):
        """Booking completed > 24h ago → chat window expired → 409."""
        # slot 50 hours ago, 60-minute service → ended 49h ago → window closed 25h ago.
        _make_booking_fixture(
            customer=self.customer, bp=self.bp,
            status='completed',
            slot_offset_hours=-50,
            duration_minutes=60,
        )
        view = AdminCustomerMessageView.as_view()
        with mock.patch('beauty_api.admin_portal_views.get_authenticated_user',
                        return_value=_ADMIN_USER), \
             mock.patch('beauty_api.admin_portal_views.is_beauty_admin',
                        return_value=True):
            resp = view(self._post_customer({'body': 'Hello'}),
                        customer_id=self.customer.id)
        self.assertEqual(resp.status_code, 409)

    # ------------------------------------------------------------------
    # (3) Broadcast helper is called exactly once on a successful send
    # ------------------------------------------------------------------
    def test_broadcast_called_once_on_successful_send(self):
        """_broadcast_message is invoked once with the booking on a valid send."""
        booking = _make_booking_fixture(
            customer=self.customer, bp=self.bp,
            status='booked',
            slot_offset_hours=2,   # upcoming booking — is_chat_active = True
        )
        view = AdminCustomerMessageView.as_view()
        with mock.patch('beauty_api.admin_portal_views.get_authenticated_user',
                        return_value=_ADMIN_USER), \
             mock.patch('beauty_api.admin_portal_views.is_beauty_admin',
                        return_value=True), \
             mock.patch('beauty_api.admin_portal_views._broadcast_message') as mock_bcast:
            resp = view(self._post_customer({'body': 'Broadcast test'}),
                        customer_id=self.customer.id)

        self.assertEqual(resp.status_code, 201)
        mock_bcast.assert_called_once()
        # First positional arg must be the booking.
        called_booking, called_payload = mock_bcast.call_args[0]
        self.assertEqual(called_booking.id, booking.id)
        # Payload shape matches serialize_message output.
        self.assertIn('sender_type', called_payload)
        self.assertEqual(called_payload['sender_type'], 'admin')
        self.assertIn('body', called_payload)

    # ------------------------------------------------------------------
    # (4) Provider message path also broadcasts + 409 on no thread
    # ------------------------------------------------------------------
    def test_provider_message_broadcasts_on_success(self):
        """AdminProviderMessageView also calls _broadcast_message on success."""
        _make_booking_fixture(
            customer=self.customer, bp=self.bp,
            status='booked',
            slot_offset_hours=1,
        )
        view = AdminProviderMessageView.as_view()
        with mock.patch('beauty_api.admin_portal_views.get_authenticated_user',
                        return_value=_ADMIN_USER), \
             mock.patch('beauty_api.admin_portal_views.is_beauty_admin',
                        return_value=True), \
             mock.patch('beauty_api.admin_portal_views._broadcast_message') as mock_bcast:
            resp = view(self._post_provider({'body': 'Hi provider'}),
                        provider_id=self.bp.id)

        self.assertEqual(resp.status_code, 201)
        mock_bcast.assert_called_once()

    def test_provider_message_no_booking_returns_409(self):
        view = AdminProviderMessageView.as_view()
        with mock.patch('beauty_api.admin_portal_views.get_authenticated_user',
                        return_value=_ADMIN_USER), \
             mock.patch('beauty_api.admin_portal_views.is_beauty_admin',
                        return_value=True):
            resp = view(self._post_provider({'body': 'Hi'}),
                        provider_id=self.bp.id)
        self.assertEqual(resp.status_code, 409)


# ---------------------------------------------------------------------------
# has_messageable_thread field — customer detail + provider detail resolvers
# ---------------------------------------------------------------------------

class CustomerDetailMessageableThreadTests(TestCase):
    """Customer detail resolver exposes has_active_booking + has_messageable_thread."""

    def setUp(self):
        self.rf = RequestFactory()
        self.customer = BeautyUser.objects.create(
            email='thread-cust@beauty-test.com', password='x')
        self.bp = BusinessProvider.objects.create(
            email='thread-biz@beauty-test.com', password='x', business_name='Thread Salon')

    def _request(self):
        req = self.rf.get('/api/bff/beauty/resolve/')
        req.COOKIES[SESSION_COOKIE_NAME] = 'fake-session-cookie'
        return req

    def _render(self):
        with mock.patch.object(custres, 'get_authenticated_user', return_value=_ADMIN_USER), \
                mock.patch.object(custres.h, 'is_beauty_admin', return_value=True):
            return custres.resolve(self._request(),
                                   'beauty_admin_portal_customer_detail', 'dev-1',
                                   {'id': self.customer.id})

    def test_both_fields_false_with_no_booking(self):
        data = self._render()['data']
        self.assertFalse(data['has_active_booking'])
        self.assertFalse(data['has_messageable_thread'])
        self.assertIs(data['has_active_booking'], data['has_messageable_thread'])

    def test_both_fields_true_with_active_booking(self):
        _make_booking_fixture(
            customer=self.customer, bp=self.bp,
            status='booked', slot_offset_hours=2,
        )
        data = self._render()['data']
        self.assertTrue(data['has_active_booking'])
        self.assertTrue(data['has_messageable_thread'])

    def test_both_fields_true_with_completed_within_window(self):
        _make_booking_fixture(
            customer=self.customer, bp=self.bp,
            status='completed', slot_offset_hours=-1, duration_minutes=60,
        )
        data = self._render()['data']
        self.assertTrue(data['has_active_booking'])
        self.assertTrue(data['has_messageable_thread'])

    def test_both_fields_false_with_expired_window(self):
        _make_booking_fixture(
            customer=self.customer, bp=self.bp,
            status='completed', slot_offset_hours=-50, duration_minutes=60,
        )
        data = self._render()['data']
        self.assertFalse(data['has_active_booking'])
        self.assertFalse(data['has_messageable_thread'])

    def test_both_fields_false_with_only_cancelled_booking(self):
        _make_booking_fixture(
            customer=self.customer, bp=self.bp,
            status='cancelled_by_customer', slot_offset_hours=-1,
        )
        data = self._render()['data']
        self.assertFalse(data['has_active_booking'])
        self.assertFalse(data['has_messageable_thread'])


class ProviderDetailMessageableThreadTests(TestCase):
    """Provider detail resolver exposes has_active_booking + has_messageable_thread."""

    def setUp(self):
        self.rf = RequestFactory()
        self.customer = BeautyUser.objects.create(
            email='prov-thread-cust@beauty-test.com', password='x')
        self.bp = BusinessProvider.objects.create(
            email='prov-thread-biz@beauty-test.com', password='x',
            business_name='Prov Thread Salon')

    def _request(self):
        req = self.rf.get('/api/bff/beauty/resolve/')
        req.COOKIES[SESSION_COOKIE_NAME] = 'fake-session-cookie'
        return req

    def _render(self):
        with mock.patch.object(provres, 'get_authenticated_user', return_value=_ADMIN_USER), \
                mock.patch.object(provres.h, 'is_beauty_admin', return_value=True):
            return provres.resolve(self._request(),
                                   'beauty_admin_portal_provider_detail', 'dev-1',
                                   {'id': self.bp.id})

    def test_both_fields_false_with_no_booking(self):
        data = self._render()['data']
        self.assertFalse(data['has_active_booking'])
        self.assertFalse(data['has_messageable_thread'])

    def test_both_fields_true_with_active_booking(self):
        _make_booking_fixture(
            customer=self.customer, bp=self.bp,
            status='booked', slot_offset_hours=2,
        )
        data = self._render()['data']
        self.assertTrue(data['has_active_booking'])
        self.assertTrue(data['has_messageable_thread'])

    def test_both_fields_true_with_completed_within_window(self):
        _make_booking_fixture(
            customer=self.customer, bp=self.bp,
            status='completed', slot_offset_hours=-1, duration_minutes=60,
        )
        data = self._render()['data']
        self.assertTrue(data['has_active_booking'])
        self.assertTrue(data['has_messageable_thread'])

    def test_both_fields_false_with_expired_window(self):
        _make_booking_fixture(
            customer=self.customer, bp=self.bp,
            status='completed', slot_offset_hours=-50, duration_minutes=60,
        )
        data = self._render()['data']
        self.assertFalse(data['has_active_booking'])
        self.assertFalse(data['has_messageable_thread'])

    def test_both_fields_false_with_only_cancelled_booking(self):
        _make_booking_fixture(
            customer=self.customer, bp=self.bp,
            status='cancelled_by_business', slot_offset_hours=-1,
        )
        data = self._render()['data']
        self.assertFalse(data['has_active_booking'])
        self.assertFalse(data['has_messageable_thread'])


# ---------------------------------------------------------------------------
# Cross-role authorization isolation tests
# ---------------------------------------------------------------------------
# Covers the view-level _context_redirect gate AND per-resolver guards for
# 2fa/magic. Tests are structured as: wrong-role → redirect; right-role → not
# a redirect to the wrong place. Admin screens tested at the resolver level
# (matching existing patterns) and view level (_context_redirect).
# ---------------------------------------------------------------------------

_CUSTOMER_USER = {"user_type": "customer", "user_id": 1, "email": "customer@beauty-test.com"}
_BUSINESS_USER = {"user_type": "business", "user_id": 2, "email": "business@beauty-test.com"}
_NON_ADMIN_CUSTOMER = {"user_type": "customer", "user_id": 3, "email": "nonadmin@beauty-test.com"}


class CrossRoleContextRedirectTests(TestCase):
    """_context_redirect view-level gate: wrong portal → redirect, correct portal → None."""

    def test_business_on_customer_screen_redirected_to_business_home(self):
        result = bff_views._context_redirect('business', 'beauty_profile', _BUSINESS_USER)
        self.assertIsNotNone(result)
        self.assertEqual(result['action'], 'redirect')
        self.assertEqual(result['_links']['target']['screen'], 'beauty_business_home')

    def test_business_on_bookings_screen_redirected(self):
        result = bff_views._context_redirect('business', 'beauty_bookings', _BUSINESS_USER)
        self.assertIsNotNone(result)
        self.assertEqual(result['_links']['target']['screen'], 'beauty_business_home')

    def test_business_on_book_screen_redirected(self):
        result = bff_views._context_redirect('business', 'beauty_book', _BUSINESS_USER)
        self.assertIsNotNone(result)
        self.assertEqual(result['_links']['target']['screen'], 'beauty_business_home')

    def test_customer_on_business_screen_redirected_to_beauty_home(self):
        result = bff_views._context_redirect('customer', 'beauty_business_home', _CUSTOMER_USER)
        self.assertIsNotNone(result)
        self.assertEqual(result['action'], 'redirect')
        self.assertEqual(result['_links']['target']['screen'], 'beauty_home')

    def test_non_admin_customer_on_admin_screen_redirected_to_beauty_home(self):
        """Signed-in customer without admin principal → redirected to beauty_home."""
        with mock.patch.object(bff_views.h, 'is_beauty_admin', return_value=False):
            result = bff_views._context_redirect(
                'customer', 'beauty_admin_portal_dashboard', _NON_ADMIN_CUSTOMER
            )
        self.assertIsNotNone(result)
        self.assertEqual(result['action'], 'redirect')
        self.assertEqual(result['_links']['target']['screen'], 'beauty_home')

    def test_non_admin_business_on_admin_screen_redirected_to_business_home(self):
        """Signed-in business without admin principal → redirected to beauty_business_home."""
        with mock.patch.object(bff_views.h, 'is_beauty_admin', return_value=False):
            result = bff_views._context_redirect(
                'business', 'beauty_admin_portal_dashboard', _BUSINESS_USER
            )
        self.assertIsNotNone(result)
        self.assertEqual(result['_links']['target']['screen'], 'beauty_business_home')

    def test_admin_on_admin_screen_not_redirected(self):
        """Admin principal → _context_redirect returns None (pass-through to resolver)."""
        with mock.patch.object(bff_views.h, 'is_beauty_admin', return_value=True):
            result = bff_views._context_redirect(
                'customer', 'beauty_admin_portal_dashboard', _ADMIN_USER
            )
        self.assertIsNone(result)

    def test_admin_can_reach_beauty_home(self):
        """Admin IS a base customer account; beauty_home is not an admin screen."""
        with mock.patch.object(bff_views.h, 'is_beauty_admin', return_value=True):
            result = bff_views._context_redirect(
                'customer', 'beauty_home', _ADMIN_USER
            )
        self.assertIsNone(result)

    def test_unauthenticated_principal_on_admin_screen_redirected(self):
        """principal=None (unauthenticated) on an admin screen → redirect to beauty_home."""
        with mock.patch.object(bff_views.h, 'is_beauty_admin', return_value=False):
            result = bff_views._context_redirect('customer', 'beauty_admin_portal_audit', None)
        self.assertIsNotNone(result)
        self.assertEqual(result['_links']['target']['screen'], 'beauty_home')


class AdminPortal2faResolverGateTests(TestCase):
    """beauty_admin_portal_2fa resolver: non-admin → signin redirect."""

    def setUp(self):
        self.rf = RequestFactory()

    def _request(self):
        req = self.rf.get('/api/bff/beauty/resolve/')
        req.COOKIES[SESSION_COOKIE_NAME] = 'fake-session-cookie'
        return req

    def test_unauthenticated_redirected_to_signin(self):
        with mock.patch.object(twofares, 'get_authenticated_user', return_value=None):
            resp = twofares.resolve(self._request(), 'beauty_admin_portal_2fa', 'dev-1')
        self.assertEqual(resp['action'], 'redirect')
        self.assertEqual(resp['_links']['target']['screen'], 'beauty_admin_portal_signin')

    def test_non_admin_customer_redirected_to_signin(self):
        with mock.patch.object(twofares, 'get_authenticated_user', return_value=_NON_ADMIN_CUSTOMER), \
                mock.patch.object(twofares.h, 'is_beauty_admin', return_value=False):
            resp = twofares.resolve(self._request(), 'beauty_admin_portal_2fa', 'dev-1')
        self.assertEqual(resp['action'], 'redirect')
        self.assertEqual(resp['_links']['target']['screen'], 'beauty_admin_portal_signin')

    def test_admin_gets_render(self):
        with mock.patch.object(twofares, 'get_authenticated_user', return_value=_ADMIN_USER), \
                mock.patch.object(twofares.h, 'is_beauty_admin', return_value=True):
            resp = twofares.resolve(self._request(), 'beauty_admin_portal_2fa', 'dev-1')
        self.assertEqual(resp['action'], 'render')
        self.assertEqual(resp['screen'], 'beauty_admin_portal_2fa')


class AdminPortalMagicResolverGateTests(TestCase):
    """beauty_admin_portal_magic resolver: non-admin → signin redirect."""

    def setUp(self):
        self.rf = RequestFactory()

    def _request(self):
        req = self.rf.get('/api/bff/beauty/resolve/')
        req.COOKIES[SESSION_COOKIE_NAME] = 'fake-session-cookie'
        return req

    def test_unauthenticated_redirected_to_signin(self):
        with mock.patch.object(magicres, 'get_authenticated_user', return_value=None):
            resp = magicres.resolve(self._request(), 'beauty_admin_portal_magic', 'dev-1')
        self.assertEqual(resp['action'], 'redirect')
        self.assertEqual(resp['_links']['target']['screen'], 'beauty_admin_portal_signin')

    def test_non_admin_customer_redirected_to_signin(self):
        with mock.patch.object(magicres, 'get_authenticated_user', return_value=_NON_ADMIN_CUSTOMER), \
                mock.patch.object(magicres.h, 'is_beauty_admin', return_value=False):
            resp = magicres.resolve(self._request(), 'beauty_admin_portal_magic', 'dev-1')
        self.assertEqual(resp['action'], 'redirect')
        self.assertEqual(resp['_links']['target']['screen'], 'beauty_admin_portal_signin')

    def test_admin_gets_render(self):
        with mock.patch.object(magicres, 'get_authenticated_user', return_value=_ADMIN_USER), \
                mock.patch.object(magicres.h, 'is_beauty_admin', return_value=True):
            resp = magicres.resolve(self._request(), 'beauty_admin_portal_magic', 'dev-1')
        self.assertEqual(resp['action'], 'render')
        self.assertEqual(resp['screen'], 'beauty_admin_portal_magic')


class ResolverLevelCrossRoleTests(TestCase):
    """Resolver-level: wrong-role principals → redirect (not render)."""

    def setUp(self):
        self.rf = RequestFactory()

    def _request(self):
        req = self.rf.get('/api/bff/beauty/resolve/')
        req.COOKIES[SESSION_COOKIE_NAME] = 'fake-session-cookie'
        return req

    # -- Customer resolvers reject a business principal ----------------------

    def test_business_on_beauty_profile_resolver_hits_view_gate(self):
        """View-level gate fires for business on beauty_profile; resolver unreachable."""
        # Confirm _context_redirect catches this — no need to call resolver directly.
        with mock.patch.object(bff_views.h, 'is_beauty_admin', return_value=False):
            result = bff_views._context_redirect('business', 'beauty_profile', _BUSINESS_USER)
        self.assertIsNotNone(result)
        self.assertEqual(result['_links']['target']['screen'], 'beauty_business_home')

    def test_business_on_beauty_bookings_resolver_hits_view_gate(self):
        with mock.patch.object(bff_views.h, 'is_beauty_admin', return_value=False):
            result = bff_views._context_redirect('business', 'beauty_bookings', _BUSINESS_USER)
        self.assertIsNotNone(result)
        self.assertEqual(result['_links']['target']['screen'], 'beauty_business_home')

    def test_business_on_beauty_book_resolver_hits_view_gate(self):
        with mock.patch.object(bff_views.h, 'is_beauty_admin', return_value=False):
            result = bff_views._context_redirect('business', 'beauty_book', _BUSINESS_USER)
        self.assertIsNotNone(result)
        self.assertEqual(result['_links']['target']['screen'], 'beauty_business_home')

    # -- Business resolver rejects a customer principal ----------------------

    def test_customer_on_beauty_business_home_hits_view_gate(self):
        with mock.patch.object(bff_views.h, 'is_beauty_admin', return_value=False):
            result = bff_views._context_redirect('customer', 'beauty_business_home', _CUSTOMER_USER)
        self.assertIsNotNone(result)
        self.assertEqual(result['_links']['target']['screen'], 'beauty_home')

    # -- Admin screen rejects non-admin customer at view level ---------------

    def test_non_admin_customer_on_admin_dashboard_view_gate(self):
        with mock.patch.object(bff_views.h, 'is_beauty_admin', return_value=False):
            result = bff_views._context_redirect(
                'customer', 'beauty_admin_portal_dashboard', _NON_ADMIN_CUSTOMER
            )
        self.assertIsNotNone(result)
        self.assertEqual(result['action'], 'redirect')
        self.assertEqual(result['_links']['target']['screen'], 'beauty_home')

    # -- Admin still reaches admin AND customer screens ----------------------

    def test_admin_customer_passes_view_gate_for_admin_screen(self):
        with mock.patch.object(bff_views.h, 'is_beauty_admin', return_value=True):
            result = bff_views._context_redirect(
                'customer', 'beauty_admin_portal_dashboard', _ADMIN_USER
            )
        self.assertIsNone(result)

    def test_admin_customer_passes_view_gate_for_beauty_home(self):
        """Admin is also a customer — must not be blocked from beauty_home."""
        with mock.patch.object(bff_views.h, 'is_beauty_admin', return_value=True):
            result = bff_views._context_redirect('customer', 'beauty_home', _ADMIN_USER)
        self.assertIsNone(result)

    # -- Resolver-level: dashboard rejects non-admin -------------------------

    def test_non_admin_on_dashboard_resolver_redirected_to_signin(self):
        with mock.patch.object(dashres, 'get_authenticated_user', return_value=_NON_ADMIN_CUSTOMER), \
                mock.patch.object(dashres.h, 'is_beauty_admin', return_value=False):
            resp = dashres.resolve(self._request(), 'beauty_admin_portal_dashboard', 'dev-1')
        self.assertEqual(resp['action'], 'redirect')
        self.assertEqual(resp['_links']['target']['screen'], 'beauty_admin_portal_signin')


# ---------------------------------------------------------------------------
# SignUpView — signup-disabled flag guard (B2) + device_id required (S1)
# ---------------------------------------------------------------------------

from beauty_api.views import SignUpView

# The view does `from bff_api.services.hateoas_service import is_signup_enabled`,
# so the bound name lives in beauty_api.views — patch it there.
_SIGNUP_FLAG = 'beauty_api.views.is_signup_enabled'


class SignUpViewFlagTests(TestCase):
    """B2: POST /api/beauty/signup/ must respect the signup-disabled flag."""

    def setUp(self):
        self.rf = APIRequestFactory()

    def _post(self, body):
        return self.rf.post('/api/beauty/signup/', body, format='json')

    def test_signup_disabled_flag_returns_403_before_account_creation(self):
        """When is_signup_enabled() is False, SignUpView returns 403 and creates no user."""
        initial_count = BeautyUser.objects.count()
        view = SignUpView.as_view()
        with mock.patch(_SIGNUP_FLAG, return_value=False):
            resp = view(self._post({
                'email': 'blocked@beauty-test.com',
                'password': 'Test1234!',
                'device_id': 'dev-test-1',
            }))
        self.assertEqual(resp.status_code, 403)
        self.assertIn('disabled', resp.data.get('detail', '').lower())
        # No account must have been created.
        self.assertEqual(BeautyUser.objects.count(), initial_count)

    def test_signup_enabled_flag_allows_account_creation(self):
        """When is_signup_enabled() is True, a valid payload creates the account."""
        view = SignUpView.as_view()
        with mock.patch(_SIGNUP_FLAG, return_value=True):
            resp = view(self._post({
                'email': 'newuser@beauty-test.com',
                'password': 'Test1234!',
                'device_id': 'dev-test-2',
            }))
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(BeautyUser.objects.filter(email='newuser@beauty-test.com').exists())


class SignUpViewDeviceIdTests(TestCase):
    """S1: POST /api/beauty/signup/ must require device_id (mirrors LoginView)."""

    def setUp(self):
        self.rf = APIRequestFactory()

    def _post(self, body):
        return self.rf.post('/api/beauty/signup/', body, format='json')

    def test_missing_device_id_returns_400(self):
        """No device_id in payload → 400; no account created."""
        initial_count = BeautyUser.objects.count()
        view = SignUpView.as_view()
        with mock.patch(_SIGNUP_FLAG, return_value=True):
            resp = view(self._post({
                'email': 'nodevice@beauty-test.com',
                'password': 'Test1234!',
            }))
        self.assertEqual(resp.status_code, 400)
        self.assertIn('device_id', resp.data)
        self.assertEqual(BeautyUser.objects.count(), initial_count)

    def test_empty_device_id_returns_400(self):
        """Blank device_id → 400 (validate_device_id rejects it)."""
        initial_count = BeautyUser.objects.count()
        view = SignUpView.as_view()
        with mock.patch(_SIGNUP_FLAG, return_value=True):
            resp = view(self._post({
                'email': 'emptydevice@beauty-test.com',
                'password': 'Test1234!',
                'device_id': '   ',
            }))
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(BeautyUser.objects.count(), initial_count)

    def test_valid_device_id_creates_account_and_sets_cookie(self):
        """Valid device_id → 201 + session cookie bound (auto-login)."""
        view = SignUpView.as_view()
        with mock.patch(_SIGNUP_FLAG, return_value=True):
            resp = view(self._post({
                'email': 'withdevice@beauty-test.com',
                'password': 'Test1234!',
                'device_id': 'dev-test-3',
            }))
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(BeautyUser.objects.filter(email='withdevice@beauty-test.com').exists())
        # Auto-login: a beauty_auth session must exist for this device.
        user = BeautyUser.objects.get(email='withdevice@beauty-test.com')
        from beauty_api.models import BeautySession
        self.assertTrue(
            BeautySession.objects.filter(
                user_id=user.id,
                user_type=BeautySession.USER_TYPE_CUSTOMER,
                device_id='dev-test-3',
                is_active=True,
            ).exists()
        )
