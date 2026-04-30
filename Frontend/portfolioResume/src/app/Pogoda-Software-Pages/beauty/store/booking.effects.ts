/**
 * Booking flow NgRx effects
 * -------------------------
 * Side-effects that bridge the booking actions to the BFF over HTTP.
 *
 * `confirmBookingStart$` POSTs the form body to the supplied submit URL
 * and dispatches success (with the new booking id) or failure.
 *
 * `requestCancelConfirmed$` POSTs the cancel link saved in state by
 * `requestCancel` (after the customer accepts the modal) and dispatches
 * success or failure.
 *
 * NOTE: actual money-movement (refunds) is NEVER triggered from the
 * client. The backend handles refund flow when it receives the cancel
 * call. See `// TODO: stripe refund` markers in the cancel handlers.
 */

import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';

import { BeautyAuthService } from '../beauty-auth.service';
import { BffLink } from '../beauty-bff.types';
import * as BookingActions from './booking.actions';
import { bookingFeature } from './booking.reducer';

@Injectable()
export class BookingEffects {
  private actions$ = inject(Actions);
  private store = inject(Store);
  private authService = inject(BeautyAuthService);

  confirmBookingStart$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BookingActions.confirmBookingStart),
      switchMap(({ submitHref, body }) => {
        const link: BffLink = {
          rel: 'submit',
          href: submitHref,
          method: 'POST',
          screen: null,
          route: null,
          prompt: null,
        };
        return this.authService.follow<{ id?: number }>(link, body).pipe(
          map((resp) => {
            const id = Number(resp?.id);
            if (!Number.isFinite(id) || id <= 0) {
              return BookingActions.confirmBookingFailure({
                message: 'Booking response missing id.',
              });
            }
            return BookingActions.confirmBookingSuccess({ bookingId: id });
          }),
          catchError((err) =>
            of(
              BookingActions.confirmBookingFailure({
                message:
                  (err?.error?.detail as string) ||
                  'Could not create that booking. Please try again.',
              }),
            ),
          ),
        );
      }),
    ),
  );

  requestCancelConfirmed$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BookingActions.requestCancelConfirmed),
      withLatestFrom(this.store.select(bookingFeature.selectPendingCancelLink)),
      switchMap(([_, link]) => {
        if (!link) {
          return of(
            BookingActions.requestCancelFailure({
              message: 'Missing cancel link.',
            }),
          );
        }
        return this.authService.follow(link).pipe(
          map(() => BookingActions.requestCancelSuccess()),
          catchError(() =>
            of(
              BookingActions.requestCancelFailure({
                message: 'Could not cancel that booking. Please try again.',
              }),
            ),
          ),
        );
      }),
    ),
  );
}
