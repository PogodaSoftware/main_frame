/**
 * Webhooks NgRx actions
 * ---------------------
 * The Beauty app cares about a small set of webhook events
 * (Stripe payment status, business cancellations, etc.). The slice
 * keeps the most-recent N events keyed by id so future side-panes /
 * notifications can subscribe to a single selector.
 *
 * SSE wiring (see `webhooks.effects.ts`) is gated behind a feature
 * flag — when no SSE endpoint is reachable the slice still works for
 * client-side test seeding via `webhookEventReceived`.
 */

import { createAction, props } from '@ngrx/store';

export interface WebhookEvent {
  id: string;
  type: string;
  occurred_at: string;
  payload: Record<string, unknown>;
}

export const webhookEventReceived = createAction(
  '[Beauty Webhooks] Event Received',
  props<{ event: WebhookEvent }>(),
);

export const webhookStreamConnected = createAction(
  '[Beauty Webhooks] Stream Connected',
);

export const webhookStreamDisconnected = createAction(
  '[Beauty Webhooks] Stream Disconnected',
);

export const webhookStreamError = createAction(
  '[Beauty Webhooks] Stream Error',
  props<{ message: string }>(),
);

export const webhookEventsClear = createAction(
  '[Beauty Webhooks] Clear',
);
