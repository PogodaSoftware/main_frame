"""
Unit tests for Task #55 marketplace visibility gating.

A provider linked to a BusinessProvider is publicly visible/bookable only
while that business's onboarding application is ``accepted``. Providers with
no linked business account (legacy storefronts) are always visible.

Covers the helpers in ``availability_service`` (the mechanism every gated
read/write path shares) and the two customer read paths the code review
found leaking: the service-search resolver and the home nearby-providers
carousel.
"""

from unittest.mock import patch

from django.test import RequestFactory, TestCase

from .availability_service import (
    is_provider_publicly_visible,
    marketplace_visibility_q,
)
from .models import (
    BeautyProvider,
    BeautyService,
    BusinessProvider,
    BusinessProviderApplication,
)


def _business(email: str, status: str | None = None) -> BusinessProvider:
    bp = BusinessProvider.objects.create(
        email=email, password='x', business_name=email,
    )
    if status is not None:
        BusinessProviderApplication.objects.create(
            business_provider=bp, status=status,
        )
    return bp


def _provider(name: str, business: BusinessProvider | None = None) -> BeautyProvider:
    return BeautyProvider.objects.create(
        name=name,
        business_provider_id=business.id if business else None,
    )


def _service(provider: BeautyProvider, name: str = 'Cut') -> BeautyService:
    return BeautyService.objects.create(
        provider=provider, category=BeautyService.CATEGORY_HAIR, name=name,
    )


class VisibilityHelperTests(TestCase):
    def test_unlinked_provider_always_visible(self):
        p = _provider('legacy')
        self.assertTrue(is_provider_publicly_visible(p))

    def test_accepted_application_visible(self):
        p = _provider('ok', _business('ok@x.com', BusinessProviderApplication.STATUS_ACCEPTED))
        self.assertTrue(is_provider_publicly_visible(p))

    def test_non_accepted_statuses_hidden(self):
        for status in (
            BusinessProviderApplication.STATUS_DRAFT,
            BusinessProviderApplication.STATUS_SUBMITTED,
            BusinessProviderApplication.STATUS_REJECTED,
        ):
            with self.subTest(status=status):
                p = _provider(status, _business(f'{status}@x.com', status))
                self.assertFalse(is_provider_publicly_visible(p))

    def test_business_without_application_row_hidden(self):
        p = _provider('noapp', _business('noapp@x.com'))
        self.assertFalse(is_provider_publicly_visible(p))

    # Migrations seed demo rows, so the test DB is never empty — assert
    # membership of the rows this test created, not whole-table equality.
    def test_q_filter_on_providers(self):
        visible = _provider('vis', _business('vis@x.com', BusinessProviderApplication.STATUS_ACCEPTED))
        legacy = _provider('legacy')
        hidden = _provider('hidden', _business('hidden@x.com', BusinessProviderApplication.STATUS_DRAFT))

        got = set(
            BeautyProvider.objects.filter(marketplace_visibility_q())
            .values_list('id', flat=True)
        )
        self.assertIn(visible.id, got)
        self.assertIn(legacy.id, got)
        self.assertNotIn(hidden.id, got)

    def test_q_filter_through_service_relation(self):
        svc_ok = _service(_provider('vis', _business('vis@x.com', BusinessProviderApplication.STATUS_ACCEPTED)))
        svc_hidden = _service(_provider('hidden', _business('hidden@x.com', BusinessProviderApplication.STATUS_SUBMITTED)))

        got = set(
            BeautyService.objects.filter(marketplace_visibility_q('provider__'))
            .values_list('id', flat=True)
        )
        self.assertIn(svc_ok.id, got)
        self.assertNotIn(svc_hidden.id, got)


class ReadPathGatingTests(TestCase):
    """The two customer read paths that leaked before the review fixes."""

    # Exact shape of auth_service.get_authenticated_user's customer payload.
    _AUTH_USER = {
        'user_id': 1, 'user_type': 'customer',
        'email': 't@x.com', 'business_name': None, 'city': '',
    }

    def setUp(self):
        self.rf = RequestFactory()
        self.visible = _service(
            _provider('Visible Studio', _business('v@x.com', BusinessProviderApplication.STATUS_ACCEPTED)),
            name='Visible Cut',
        )
        self.hidden = _service(
            _provider('Hidden Studio', _business('h@x.com', BusinessProviderApplication.STATUS_DRAFT)),
            name='Hidden Cut',
        )

    def test_service_search_excludes_unapproved(self):
        from bff_api.resolvers import beauty_service_search

        with patch.object(
            beauty_service_search, 'get_authenticated_user', return_value=self._AUTH_USER,
        ):
            env = beauty_service_search.resolve(self.rf.get('/'), 'beauty_service_search', 'dev1', {})

        ids = {item['id'] for item in env['data']['items']}
        self.assertIn(self.visible.id, ids)
        self.assertNotIn(self.hidden.id, ids)

    def test_home_carousel_excludes_unapproved(self):
        from bff_api.resolvers import beauty_home

        with patch.object(
            beauty_home, 'get_authenticated_user', return_value=self._AUTH_USER,
        ):
            env = beauty_home.resolve(self.rf.get('/'), 'beauty_home', 'dev1', {})

        names = {p['name'] for p in env['data']['nearby_providers']}
        self.assertIn('Visible Studio', names)
        self.assertNotIn('Hidden Studio', names)
