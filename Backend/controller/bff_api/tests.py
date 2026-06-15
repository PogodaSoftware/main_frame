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
    BeautySession,
    BeautyUser,
)
from beauty_api.admin_portal_views import AdminTagCreateView
from beauty_api.admin_crm_views import CrmSuspendView
from bff_api.resolvers import beauty_admin_portal_tag_manager as tagmgr
from bff_api.resolvers import beauty_admin_portal_suspend as suspendres
from bff_api.resolvers import beauty_admin_portal_customer_detail as custres


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
