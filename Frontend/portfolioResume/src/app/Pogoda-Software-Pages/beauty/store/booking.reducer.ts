/**
 * Booking flow NgRx reducer
 * -------------------------
 * Caches the customer's in-progress booking selection plus the most-
 * recently-resolved booking's grace state so navigation between
 * /book → /success → /detail doesn't flash empty UI.
 */

import { createFeature, createReducer, on } from '@ngrx/store';
import { BffLink } from '../beauty-bff.types';
import * as BookingActions from './booking.actions';

export interface BookingState {
  selectedServiceId: number | null;
  selectedDayLocal: string | null;
  selectedSlotIso: string | null;
  lastResolvedBookingId: number | null;
  inGracePeriod: boolean;
  gracePeriodEndsAt: string | null;
  pendingCancelLink: BffLink | null;
  /** Which destructive action the modal is currently asking about. */
  cancelKind: 'cancel' | 'cancel_grace' | null;
  cancelInFlight: boolean;
  cancelError: string | null;
  confirmInFlight: boolean;
  confirmError: string | null;
}

export const initialBookingState: BookingState = {
  selectedServiceId: null,
  selectedDayLocal: null,
  selectedSlotIso: null,
  lastResolvedBookingId: null,
  inGracePeriod: false,
  gracePeriodEndsAt: null,
  pendingCancelLink: null,
  cancelKind: null,
  cancelInFlight: false,
  cancelError: null,
  confirmInFlight: false,
  confirmError: null,
};

const reducer = createReducer(
  initialBookingState,
  on(BookingActions.selectDay, (state, { dayLocal }) => ({
    ...state,
    selectedDayLocal: dayLocal,
    // Selecting a different day invalidates the previously chosen slot.
    selectedSlotIso: null,
  })),
  on(BookingActions.selectSlot, (state, { slotIso, serviceId }) => ({
    ...state,
    selectedSlotIso: slotIso,
    selectedServiceId: serviceId,
  })),
  on(BookingActions.confirmBookingStart, (state) => ({
    ...state,
    confirmInFlight: true,
    confirmError: null,
  })),
  on(BookingActions.confirmBookingSuccess, (state, { bookingId }) => ({
    ...state,
    confirmInFlight: false,
    lastResolvedBookingId: bookingId,
    confirmError: null,
  })),
  on(BookingActions.confirmBookingFailure, (state, { message }) => ({
    ...state,
    confirmInFlight: false,
    confirmError: message,
  })),
  on(BookingActions.enterGracePeriod, (state, { bookingId, cancelLink, gracePeriodEndsAt }) => ({
    ...state,
    lastResolvedBookingId: bookingId,
    inGracePeriod: true,
    gracePeriodEndsAt,
    pendingCancelLink: cancelLink,
  })),
  on(BookingActions.clearGracePeriod, (state) => ({
    ...state,
    inGracePeriod: false,
    gracePeriodEndsAt: null,
    pendingCancelLink: null,
  })),
  on(BookingActions.requestCancel, (state, { cancelLink, kind }) => ({
    ...state,
    pendingCancelLink: cancelLink,
    cancelKind: kind,
    cancelError: null,
  })),
  on(BookingActions.requestCancelConfirmed, (state) => ({
    ...state,
    cancelInFlight: true,
  })),
  on(BookingActions.requestCancelDismissed, (state) => ({
    ...state,
    cancelKind: null,
    pendingCancelLink: null,
  })),
  on(BookingActions.requestCancelSuccess, (state) => ({
    ...state,
    cancelInFlight: false,
    cancelKind: null,
    pendingCancelLink: null,
    inGracePeriod: false,
    gracePeriodEndsAt: null,
  })),
  on(BookingActions.requestCancelFailure, (state, { message }) => ({
    ...state,
    cancelInFlight: false,
    cancelKind: null,
    cancelError: message,
  })),
);

export const bookingFeature = createFeature({
  name: 'beautyBooking',
  reducer,
});
