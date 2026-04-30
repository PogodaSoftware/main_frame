/**
 * Booking flow NgRx actions
 * -------------------------
 * Action creators for the customer booking flow. The store does NOT
 * replace the BFF — it caches what the BFF already returns to reduce
 * flicker on navigation between Provider → Book → Confirm → Detail.
 *
 * Effects (`booking.effects.ts`) hang off of:
 *   - `confirmBookingStart` — POST to BFF, emit success/error
 *   - `requestCancel`       — open the confirm modal then POST cancel
 */

import { createAction, props } from '@ngrx/store';
import { BffLink } from '../beauty-bff.types';

export const selectDay = createAction(
  '[Beauty Booking] Select Day',
  props<{ dayLocal: string }>(),
);

export const selectSlot = createAction(
  '[Beauty Booking] Select Slot',
  props<{ slotIso: string; serviceId: number }>(),
);

export const confirmBookingStart = createAction(
  '[Beauty Booking] Confirm Booking Start',
  props<{ submitHref: string; body: Record<string, unknown> }>(),
);

export const confirmBookingSuccess = createAction(
  '[Beauty Booking] Confirm Booking Success',
  props<{ bookingId: number }>(),
);

export const confirmBookingFailure = createAction(
  '[Beauty Booking] Confirm Booking Failure',
  props<{ message: string }>(),
);

export const enterGracePeriod = createAction(
  '[Beauty Booking] Enter Grace Period',
  props<{ bookingId: number; cancelLink: BffLink; gracePeriodEndsAt: string }>(),
);

export const clearGracePeriod = createAction(
  '[Beauty Booking] Clear Grace Period',
);

export const requestCancel = createAction(
  '[Beauty Booking] Request Cancel',
  props<{ bookingId: number; cancelLink: BffLink; kind: 'cancel' | 'cancel_grace' }>(),
);

export const requestCancelConfirmed = createAction(
  '[Beauty Booking] Request Cancel Confirmed',
);

export const requestCancelDismissed = createAction(
  '[Beauty Booking] Request Cancel Dismissed',
);

export const requestCancelSuccess = createAction(
  '[Beauty Booking] Request Cancel Success',
);

export const requestCancelFailure = createAction(
  '[Beauty Booking] Request Cancel Failure',
  props<{ message: string }>(),
);
