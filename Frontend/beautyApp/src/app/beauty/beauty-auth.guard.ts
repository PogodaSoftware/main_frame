/**
 * BeautyAuthGuard
 * ---------------
 * Functional route guard that protects Beauty app routes requiring login.
 * Calls the /me/ endpoint (which runs the backend middleware) to confirm
 * the HttpOnly cookie is present, valid, and device-matched.
 * On failure the user is redirected to /pogoda/beauty/login.
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { BeautyAuthService } from './beauty-auth.service';

export const beautyAuthGuard: CanActivateFn = () => {
  const authService = inject(BeautyAuthService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    map((authenticated) => {
      if (authenticated) {
        return true;
      }
      return router.createUrlTree(['/pogoda/beauty/welcome']);
    }),
    catchError(() => {
      return of(router.createUrlTree(['/pogoda/beauty/welcome']));
    }),
  );
};

export const beautyBusinessAuthGuard: CanActivateFn = () => {
  const authService = inject(BeautyAuthService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    map((authenticated) => {
      if (authenticated) {
        return true;
      }
      return router.createUrlTree(['/pogoda/beauty/business/login']);
    }),
    catchError(() => {
      return of(router.createUrlTree(['/pogoda/beauty/business/login']));
    }),
  );
};
