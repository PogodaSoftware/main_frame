import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { BeautyAuthService } from './beauty-auth.service';

// Customer-context routes. A business principal is bounced to its own
// portal — the two contexts must never cross.
export const beautyAuthGuard: CanActivateFn = () => {
  const authService = inject(BeautyAuthService);
  const router = inject(Router);

  return authService.sessionType().pipe(
    map((type) => {
      if (type === 'customer') return true;
      if (type === 'business') return router.createUrlTree(['/business']);
      return router.createUrlTree(['/welcome']);
    }),
    catchError(() => of(router.createUrlTree(['/welcome']))),
  );
};

// Business-context routes. A customer principal is bounced to the
// customer home.
export const beautyBusinessAuthGuard: CanActivateFn = () => {
  const authService = inject(BeautyAuthService);
  const router = inject(Router);

  return authService.sessionType().pipe(
    map((type) => {
      if (type === 'business') return true;
      if (type === 'customer') return router.createUrlTree(['/']);
      return router.createUrlTree(['/business/login']);
    }),
    catchError(() => of(router.createUrlTree(['/business/login']))),
  );
};
