/**
 * Webhooks NgRx effects
 * ---------------------
 * Action shapes only for now. A real SSE wire-up to
 * `GET /api/beauty/events/stream/` would live here once the backend
 * ships that endpoint. See the Stripe webhook plan in
 * `docs/third-party-costs-research.md` — the plan is to relay Stripe
 * events into our own SSE stream so the BFF stays the only thing the
 * client talks to.
 *
 * TODO: stripe webhook stream — wire EventSource here when the
 * backend exposes /api/beauty/events/stream/. Until then this class
 * exists so providers wiring is symmetrical with `BookingEffects`
 * and tests can assert the slice exists.
 */

import { Injectable } from '@angular/core';

@Injectable()
export class WebhooksEffects {
  // Intentionally empty — see file header.
}
