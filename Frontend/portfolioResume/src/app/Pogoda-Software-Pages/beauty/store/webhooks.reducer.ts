/**
 * Webhooks NgRx reducer
 * ---------------------
 * Minimal slice — keeps a deduplicated list (by `id`) of the most-recent
 * `MAX_EVENTS` webhook events plus a connection-state flag.
 *
 * SSE backfill is wired by `webhooks.effects.ts` when (and only when)
 * the backend exposes `GET /api/beauty/events/stream/`. See:
 *   docs/third-party-costs-research.md   (Stripe webhook plan)
 */

import { createFeature, createReducer, on } from '@ngrx/store';
import * as WebhookActions from './webhooks.actions';
import type { WebhookEvent } from './webhooks.actions';

export interface WebhooksState {
  webhookEvents: WebhookEvent[];
  connected: boolean;
  lastError: string | null;
}

export const initialWebhooksState: WebhooksState = {
  webhookEvents: [],
  connected: false,
  lastError: null,
};

const MAX_EVENTS = 50;

const reducer = createReducer(
  initialWebhooksState,
  on(WebhookActions.webhookEventReceived, (state, { event }) => {
    if (state.webhookEvents.some((e) => e.id === event.id)) return state;
    const next = [event, ...state.webhookEvents];
    if (next.length > MAX_EVENTS) next.length = MAX_EVENTS;
    return { ...state, webhookEvents: next };
  }),
  on(WebhookActions.webhookStreamConnected, (state) => ({
    ...state,
    connected: true,
    lastError: null,
  })),
  on(WebhookActions.webhookStreamDisconnected, (state) => ({
    ...state,
    connected: false,
  })),
  on(WebhookActions.webhookStreamError, (state, { message }) => ({
    ...state,
    connected: false,
    lastError: message,
  })),
  on(WebhookActions.webhookEventsClear, (state) => ({
    ...state,
    webhookEvents: [],
  })),
);

export const webhooksFeature = createFeature({
  name: 'beautyWebhooks',
  reducer,
});
