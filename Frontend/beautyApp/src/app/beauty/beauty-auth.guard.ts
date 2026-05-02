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
      return router.createUrlTree(['/welcome']);
    }),
    catchError(() => {
      return of(router.createUrlTree(['/welcome']));
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
      return router.createUrlTree(['/business/login']);
    }),
    catchError(() => {
      return of(router.createUrlTree(['/business/login']));
    }),
  );
};
