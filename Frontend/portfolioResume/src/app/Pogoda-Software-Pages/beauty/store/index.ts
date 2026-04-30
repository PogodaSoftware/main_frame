/**
 * Beauty NgRx feature providers
 * -----------------------------
 * Single import surface for `app.config.ts` to register the booking
 * and webhooks slices.
 */

import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';

import { bookingFeature } from './booking.reducer';
import { BookingEffects } from './booking.effects';
import { webhooksFeature } from './webhooks.reducer';
import { WebhooksEffects } from './webhooks.effects';

export const provideBeautyStoreFeatures = () => [
  provideState(bookingFeature),
  provideState(webhooksFeature),
  provideEffects([BookingEffects, WebhooksEffects]),
];

export { bookingFeature, webhooksFeature };
export * as BookingActions from './booking.actions';
export * as WebhookActions from './webhooks.actions';
export type { BookingState } from './booking.reducer';
export type { WebhooksState } from './webhooks.reducer';
export type { WebhookEvent } from './webhooks.actions';
