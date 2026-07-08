---
name: Beauty Playwright tests
description: Gotchas when running the /pogoda/beauty Playwright page tests so you don't misread failures as regressions.
---

# Beauty Playwright page tests — how to read failures

When validating beauty changes, do NOT assume a red page-test run means you broke
something. Two independent, pre-existing issues dominate this suite:

## 1. Authed page tests are device-bound
The `beauty_auth` cookie is bound to a device id; middleware rejects requests whose
`X-Device-ID` header (derived from `localStorage['beauty_device_id']`) doesn't match.
A test that only attaches the cookie but never seeds that localStorage key gets a
fresh random id from the SPA → `/me/` returns 401 → the guard redirects every gated
screen to login. The cookie-attach helper must also seed the device id (via an
init script that runs before the SPA boots).
**Why:** the device-binding is a deliberate security control, not a bug to disable.
**How to apply:** if an authed beauty page test redirects to login, suspect a missing
device-id seed before suspecting your change.

## 2. Page-object selector drift from the Business Provider Portal redesign
Several business-portal components were redesigned to use shared `app-prov-*`
components, which dropped or changed the CSS classes / `data-testid`s the page
objects still target (e.g. `div.business-shell.business-home`, the change-password
submit button). These tests fail at the selector step *after* auth succeeds — that is
selector drift, not functionality loss.
**How to apply:** to prove a beauty backend change works, prefer the API tests plus a
direct-API script over the browser page suite; only trust a page test once you've
confirmed its selectors still match the current component. The full beauty UI suite
is not green by default until the stale selectors are reconciled.
