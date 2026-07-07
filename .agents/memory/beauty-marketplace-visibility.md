---
name: Beauty marketplace visibility (dual-surface gate)
description: Where storefront visibility / authorization gates must live so unapproved businesses can't leak into the customer marketplace.
---

# Beauty marketplace visibility must be enforced on BOTH backends

The beauty app has TWO customer-facing backends that both read providers/services directly:
- the REST catalog (`beauty_api/booking_views.py`: category list, provider detail, service detail, booking create), and
- the SDUI **BFF resolvers** (`bff_api/resolvers/beauty_category.py`, `beauty_provider_detail.py`, `beauty_book.py`) — what the Angular app actually calls.

**Rule:** any storefront visibility / authorization predicate must be applied in BOTH places. The Angular UI navigates via the BFF `resolve` endpoint, so gating only the REST catalog leaves the *primary* customer path wide open.

**Why:** a security fix that hid unapproved storefronts from the REST catalog still showed them on every real customer screen, because those screens are BFF-driven, not REST-driven. Only caught by architect review.

**How to apply:** the single source of truth lives in `availability_service.py` — `is_provider_publicly_visible(provider)` and `marketplace_visibility_q(field_prefix)`. Curated providers with `business_provider_id IS NULL` are always visible; a business-linked storefront is visible only if its `BusinessProviderApplication.status == accepted`. Reuse these helpers in every new customer-facing read/booking path (REST and BFF).

Related: business-portal write endpoints gate on the same accepted-application check via `business_views._require_business_storefront(request, *, require_accepted=True)`, which is secure-by-default — opt out (`require_accepted=False`) only for onboarding-wizard (application, availability) and account-management (password, contact, delete) endpoints, since those must work before/independent of approval.
