"""
Tests for the customer/business role-separation acceptance matrix.

Covers V1, V3, V4, V7, V8, V9, V10, V11 from the handoff spec.
V5 (OAuth/SSO), V6 (password reset), and V12 (data migration) are
not exercised here — the codebase has no OAuth or reset endpoints
yet, and V12 is a data migration whose effect is verified manually.
"""

from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.test import Client, TestCase

from .models import (
    BeautyAuthAuditLog,
    BeautyUser,
    BusinessProvider,
)


def _make_customer(email='alice@example.com', password='customer-pw-1') -> BeautyUser:
    user = BeautyUser(email=email)
    user.password = make_password(password)
    user.save()
    return user


def _make_business(email='biz@example.com', password='business-pw-1',
                   business_name='Biz Co') -> BusinessProvider:
    provider = BusinessProvider(email=email, business_name=business_name)
    provider.password = make_password(password)
    provider.save()
    return provider


class RoleSeparationTests(TestCase):

    def setUp(self):
        # Rate-limit cache is process-wide; clear between tests so the
        # 429 thresholds start fresh for every scenario.
        cache.clear()
        self.client = Client()

    # ---- V1: signup cross-role uniqueness --------------------------

    def test_customer_signup_rejected_when_email_is_business(self):
        _make_business(email='shared@example.com')
        resp = self.client.post(
            '/api/beauty/signup/',
            data={'email': 'shared@example.com', 'password': 'pw-correct-1'},
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(BeautyUser.objects.filter(email='shared@example.com').count(), 0)
        self.assertTrue(
            BeautyAuthAuditLog.objects.filter(event_type='cross_role_signup').exists()
        )

    def test_business_signup_rejected_when_email_is_customer(self):
        _make_customer(email='shared@example.com')
        resp = self.client.post(
            '/api/beauty/business/signup/',
            data={
                'email': 'shared@example.com',
                'password': 'pw-correct-1',
                'business_name': 'Shared Biz',
                'device_id': 'dev-1',
            },
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(
            BusinessProvider.objects.filter(email='shared@example.com').count(), 0,
        )

    # ---- V2: same-role login still works ---------------------------

    def test_customer_login_succeeds_with_correct_credentials(self):
        _make_customer(email='ok@example.com', password='pw-correct-1')
        resp = self.client.post(
            '/api/beauty/login/',
            data={
                'email': 'ok@example.com',
                'password': 'pw-correct-1',
                'device_id': 'dev-1',
            },
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 200)

    # ---- V3 / V4 / V7: cross-role login rejected -------------------

    def test_customer_login_rejected_when_email_is_business(self):
        _make_business(email='cross@example.com', password='biz-pw-1')
        resp = self.client.post(
            '/api/beauty/login/',
            data={
                'email': 'cross@example.com',
                'password': 'biz-pw-1',  # correct biz pw, wrong portal
                'device_id': 'dev-1',
            },
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 401)
        # V10: generic message, no role disclosure
        self.assertEqual(resp.json()['detail'], 'Invalid email or password.')
        # V9: audit row written with masked email
        audit = BeautyAuthAuditLog.objects.filter(event_type='cross_role_login').first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.masked_email, 'c***@example.com')
        self.assertEqual(audit.attempted_role, 'customer')
        self.assertEqual(audit.existing_role, 'business')

    def test_business_login_rejected_when_email_is_customer(self):
        _make_customer(email='cross2@example.com', password='cust-pw-1')
        resp = self.client.post(
            '/api/beauty/business/login/',
            data={
                'email': 'cross2@example.com',
                'password': 'cust-pw-1',
                'device_id': 'dev-1',
            },
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(resp.json()['detail'], 'Invalid email or password.')

    # ---- V8: rate-limit after repeated cross-role failures ---------

    def test_repeated_cross_role_failures_trigger_rate_limit(self):
        _make_business(email='throttle@example.com', password='biz-pw-1')
        for _ in range(5):
            resp = self.client.post(
                '/api/beauty/login/',
                data={
                    'email': 'throttle@example.com',
                    'password': 'whatever',
                    'device_id': 'dev-1',
                },
                content_type='application/json',
                REMOTE_ADDR='10.0.0.1',
            )
            self.assertEqual(resp.status_code, 401)

        # Sixth attempt is over the threshold -> 429
        resp = self.client.post(
            '/api/beauty/login/',
            data={
                'email': 'throttle@example.com',
                'password': 'whatever',
                'device_id': 'dev-1',
            },
            content_type='application/json',
            REMOTE_ADDR='10.0.0.1',
        )
        self.assertEqual(resp.status_code, 429)

    # ---- V11: session enforcement (role claim mismatch) ------------

    def test_customer_token_cannot_call_business_endpoint(self):
        _make_customer(email='c@example.com', password='pw-correct-1')
        # Login as customer
        login = self.client.post(
            '/api/beauty/login/',
            data={
                'email': 'c@example.com',
                'password': 'pw-correct-1',
                'device_id': 'dev-1',
            },
            content_type='application/json',
        )
        self.assertEqual(login.status_code, 200)
        # Try a business-only endpoint
        resp = self.client.get(
            '/api/beauty/protected/business/dashboard/',
            HTTP_X_DEVICE_ID='dev-1',
        )
        self.assertEqual(resp.status_code, 403)


class BusinessSignUpDeviceIdRequiredTests(TestCase):
    """device_id is now a required field on BusinessProviderSignUpSerializer.
    Signup without it must return 400; with it must return 201 + session cookie."""

    def setUp(self):
        self.client = Client()

    def test_signup_without_device_id_returns_400(self):
        resp = self.client.post(
            '/api/beauty/business/signup/',
            data={
                'email': 'newbiz@example.com',
                'password': 'securepass1',
                'business_name': 'New Biz',
                # device_id intentionally omitted
            },
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn('device_id', resp.json())
        self.assertEqual(BusinessProvider.objects.filter(email='newbiz@example.com').count(), 0)

    def test_signup_with_blank_device_id_returns_400(self):
        resp = self.client.post(
            '/api/beauty/business/signup/',
            data={
                'email': 'newbiz2@example.com',
                'password': 'securepass1',
                'business_name': 'New Biz 2',
                'device_id': '   ',
            },
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn('device_id', resp.json())
        self.assertEqual(BusinessProvider.objects.filter(email='newbiz2@example.com').count(), 0)

    def test_signup_with_device_id_returns_201_and_sets_cookie(self):
        from beauty_api.middleware import SESSION_COOKIE_NAME
        resp = self.client.post(
            '/api/beauty/business/signup/',
            data={
                'email': 'cookiebiz@example.com',
                'password': 'securepass1',
                'business_name': 'Cookie Biz',
                'device_id': 'test-device-99',
            },
            content_type='application/json',
        )
        self.assertEqual(resp.status_code, 201)
        self.assertIn(SESSION_COOKIE_NAME, resp.cookies)
        self.assertEqual(BusinessProvider.objects.filter(email='cookiebiz@example.com').count(), 1)
