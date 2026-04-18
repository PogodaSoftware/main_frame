/**
 * BeautyShellComponent
 * --------------------
 * The single entry point for every /pogoda/beauty/* route. Fully
 * link-driven (HATEOAS) — no client-side screen→route table.
 *
 * SDUI flow on each navigation:
 *   1. Read the requested screen from the Angular route data.
 *   2. POST /api/bff/beauty/resolve/ → get render/redirect instruction.
 *   3. Render the screen component declared by the BFF response, passing
 *      its data, _links, and form payload as @Input()s.
 *   4. Handle (followLink) events emitted by child components by
 *      navigating to the link's `route` (when present) and re-resolving
 *      via the BFF. Form submit success follows the link `success`.
 *
 * Nothing from the BFF response is stored between renders.
 */

import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, of, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { BeautyBffService } from './beauty-bff.service';
import { BeautyAuthService } from './beauty-auth.service';
import { BeautyMainComponent } from './beauty-main.component';
import { BeautyLoginComponent } from './beauty-login.component';
import { BeautySignupComponent } from './beauty-signup.component';
import { BeautyBusinessLoginComponent } from './beauty-business-login.component';
import { BeautyWireframeComponent } from './wireframe.component';
import { BeautyCategoryComponent } from './beauty-category.component';
import { BeautyProviderDetailComponent } from './beauty-provider-detail.component';
import { BeautyBookComponent } from './beauty-book.component';
import { BeautyBookingsComponent } from './beauty-bookings.component';
import { BeautyBookingSuccessComponent } from './beauty-booking-success.component';
import { BeautyBookingDetailComponent } from './beauty-booking-detail.component';
import { BeautyRescheduleComponent } from './beauty-reschedule.component';
import { BeautyProfileComponent } from './beauty-profile.component';
import { BeautyBusinessDashboardComponent } from './beauty-business-dashboard.component';
import { BeautyBusinessServicesComponent } from './beauty-business-services.component';
import { BeautyBusinessServiceFormComponent } from './beauty-business-service-form.component';
import { BeautyBusinessAvailabilityComponent } from './beauty-business-availability.component';
import { BeautyBusinessBookingsComponent } from './beauty-business-bookings.component';
import {
  AdminFlag,
  AdminFlagAuditEntry,
  BeautyAdminFlagsComponent,
  FlagToggleEvent,
} from './beauty-admin-flags.component';
import { BffLink, BffResponse } from './beauty-bff.types';

@Component({
  selector: 'app-beauty-shell',
  standalone: true,
  imports: [
    CommonModule,
    BeautyMainComponent,
    BeautyLoginComponent,
    BeautySignupComponent,
    BeautyBusinessLoginComponent,
    BeautyWireframeComponent,
    BeautyAdminFlagsComponent,
    BeautyCategoryComponent,
    BeautyProviderDetailComponent,
    BeautyBookComponent,
    BeautyBookingsComponent,
    BeautyBookingSuccessComponent,
    BeautyBookingDetailComponent,
    BeautyRescheduleComponent,
    BeautyProfileComponent,
    BeautyBusinessDashboardComponent,
    BeautyBusinessServicesComponent,
    BeautyBusinessServiceFormComponent,
    BeautyBusinessAvailabilityComponent,
    BeautyBusinessBookingsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div *ngIf="isLoading" class="shell-loading">
      <div class="shell-spinner"></div>
    </div>

    <div *ngIf="!isLoading && serverError" class="shell-error">
      <p>Unable to load. Please try again.</p>
      <button (click)="retry()">Retry</button>
    </div>

    <ng-container *ngIf="!isLoading && !serverError && bffResponse?.action === 'render'">
      <app-beauty-main
        *ngIf="bffResponse!.screen === 'beauty_home'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-login
        *ngIf="bffResponse!.screen === 'beauty_login'"
        [form]="bffResponse!.form ?? null"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-signup
        *ngIf="bffResponse!.screen === 'beauty_signup'"
        [form]="bffResponse!.form ?? null"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-business-login
        *ngIf="bffResponse!.screen === 'beauty_business_login'"
        [form]="bffResponse!.form ?? null"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-wireframe *ngIf="bffResponse!.screen === 'beauty_wireframe'" />
      <app-beauty-admin-flags
        *ngIf="bffResponse!.screen === 'beauty_admin_flags'"
        [flags]="adminFlags"
        [audit]="adminAudit"
        [adminEmail]="adminEmail"
        [busyKey]="busyFlagKey"
        (toggleFlag)="onFlagToggle($event)"
        (goHomeRequested)="goHome()"
      />
      <app-beauty-category
        *ngIf="bffResponse!.screen === 'beauty_category'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-provider-detail
        *ngIf="bffResponse!.screen === 'beauty_provider_detail'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-book
        *ngIf="bffResponse!.screen === 'beauty_book'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-bookings
        *ngIf="bffResponse!.screen === 'beauty_bookings'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-booking-success
        *ngIf="bffResponse!.screen === 'beauty_booking_success'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-booking-detail
        *ngIf="bffResponse!.screen === 'beauty_booking_detail'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-reschedule
        *ngIf="bffResponse!.screen === 'beauty_reschedule'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-profile
        *ngIf="bffResponse!.screen === 'beauty_profile'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-business-dashboard
        *ngIf="bffResponse!.screen === 'beauty_business_home'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-business-services
        *ngIf="bffResponse!.screen === 'beauty_business_services'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-business-service-form
        *ngIf="bffResponse!.screen === 'beauty_business_service_form'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-business-availability
        *ngIf="bffResponse!.screen === 'beauty_business_availability'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-business-bookings
        *ngIf="bffResponse!.screen === 'beauty_business_bookings'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
    </ng-container>
  `,
  styles: [`
    .shell-loading {
      display: flex; align-items: center; justify-content: center;
      min-height: 100dvh; background: #ffffff;
    }
    .shell-spinner {
      width: 32px; height: 32px;
      border: 3px solid #e0e0e0; border-top-color: #000000;
      border-radius: 50%; animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .shell-error {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 100dvh; gap: 16px;
      font-family: -apple-system, sans-serif; color: #212121;
    }
    .shell-error button {
      padding: 10px 24px; background: #000; color: #fff;
      border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;
    }
  `],
})
export class BeautyShellComponent implements OnInit, OnDestroy {
  bffResponse: BffResponse | null = null;
  isLoading = true;
  serverError = false;

  // Admin-flags screen state — populated whenever the BFF returns it.
  adminFlags: AdminFlag[] = [];
  adminAudit: AdminFlagAuditEntry[] = [];
  adminEmail: string | null = null;
  busyFlagKey: string | null = null;

  private currentScreen = 'beauty_home';
  private currentParams: Record<string, string | number> = {};
  private routeSub?: Subscription;

  constructor(
    private bffService: BeautyBffService,
    private authService: BeautyAuthService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading = false;
      return;
    }

    // Re-resolve whenever the route data OR the path params change so that
    // `/category/:slug`, `/providers/:id`, `/book/:serviceId` all work.
    this.routeSub = combineLatest([this.route.data, this.route.paramMap])
      .pipe(
        switchMap(([data, paramMap]) => {
          this.currentScreen = (data['screen'] as string) || 'beauty_home';
          const params: Record<string, string | number> = {};
          for (const key of paramMap.keys) {
            const value = paramMap.get(key);
            if (value != null) params[key] = value;
          }
          this.currentParams = params;
          this.isLoading = true;
          this.serverError = false;

          // Wireframe is a dev-only page — bypass the BFF entirely.
          if (this.currentScreen === 'beauty_wireframe') {
            return of({
              action: 'render' as const,
              screen: 'beauty_wireframe',
              _links: {},
            } as BffResponse);
          }

          return this.bffService.resolve(this.currentScreen, params);
        }),
      )
      .subscribe({
        next: (response) => this.applyResponse(response),
        error: () => {
          this.isLoading = false;
          this.serverError = true;
        },
      });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  retry(): void {
    this.serverError = false;
    this.isLoading = true;
    this.bffService.resolve(this.currentScreen, this.currentParams).subscribe({
      next: (r) => this.applyResponse(r),
      error: () => {
        this.isLoading = false;
        this.serverError = true;
      },
    });
  }

  /**
   * Called by every child screen with a BffLink the user clicked. The
   * shell either fires the HTTP method (e.g. logout POST) or just
   * navigates to the link's route. After the action the BFF re-resolves
   * automatically (because the route change triggers ngOnInit again).
   */
  followLink(link: BffLink): void {
    if (!link) return;

    // Navigation-only link → just push the route.
    if ((link.method || 'NAV').toUpperCase() === 'NAV') {
      this.navigateToLink(link);
      return;
    }

    // Action link with an href (e.g. logout) → call the API, then route.
    this.authService.follow(link).subscribe({
      next: () => this.navigateToLink(link),
      error: () => this.navigateToLink(link),
    });
  }

  /**
   * Last-resort screen→route map. The BFF always supplies `link.route`,
   * but if a future or older link arrives without one, we can still
   * navigate by name instead of just retrying the current screen.
   */
  private static readonly SCREEN_FALLBACK_ROUTES: Record<string, string> = {
    beauty_home: '/pogoda/beauty',
    beauty_login: '/pogoda/beauty/login',
    beauty_signup: '/pogoda/beauty/signup',
    beauty_business_login: '/pogoda/beauty/business/login',
    beauty_wireframe: '/pogoda/beauty/wireframe',
    beauty_admin_flags: '/pogoda/beauty/admin/flags',
    beauty_bookings: '/pogoda/beauty/bookings',
    beauty_profile: '/pogoda/beauty/profile',
    // beauty_reschedule and beauty_booking_detail are param routes — the
    // BFF always supplies a substituted `route`, so no fallback entry.
    beauty_business_home: '/pogoda/beauty/business',
    beauty_business_services: '/pogoda/beauty/business/services',
    beauty_business_availability: '/pogoda/beauty/business/availability',
    beauty_business_bookings: '/pogoda/beauty/business/bookings',
  };

  private navigateToLink(link: BffLink): void {
    const targetRoute =
      link.route ||
      (link.screen
        ? BeautyShellComponent.SCREEN_FALLBACK_ROUTES[link.screen] ?? null
        : null);

    if (targetRoute) {
      // If we're already on this URL, Angular ignores the navigation by
      // default — re-resolve in place so screens update after mutations
      // like cancel-booking.
      if (this.router.url === targetRoute) {
        this.retry();
      } else {
        this.router.navigateByUrl(targetRoute);
      }
      return;
    }
    // Last resort: re-resolve the current screen.
    this.retry();
  }

  /** Called by the admin-flags child when the user clicks a toggle. */
  onFlagToggle(event: FlagToggleEvent): void {
    if (this.busyFlagKey) return;
    this.busyFlagKey = event.body.key;

    this.authService.follow(event.link, event.body).subscribe({
      next: () => {
        this.busyFlagKey = null;
        // Re-resolve so we render the freshly-saved value AND a new audit row.
        this.retry();
      },
      error: () => {
        this.busyFlagKey = null;
        this.serverError = true;
      },
    });
  }

  goHome(): void {
    this.router.navigateByUrl('/pogoda/beauty');
  }

  private applyResponse(response: BffResponse): void {
    this.isLoading = false;
    if (response.action === 'render' && response.screen === 'beauty_admin_flags') {
      const data = (response.data ?? {}) as Record<string, unknown>;
      this.adminFlags = (data['flags'] as AdminFlag[]) ?? [];
      this.adminAudit = (data['audit'] as AdminFlagAuditEntry[]) ?? [];
      this.adminEmail = (data['admin_email'] as string) ?? null;
    }
    if (response.action === 'redirect') {
      const target = response._links?.['target'];
      if (target) {
        this.navigateToLink(target);
        return;
      }
      // Legacy fallback: emit a synthetic NAV link from redirect_to.
      if (response.redirect_to) {
        this.navigateToLink({
          rel: 'target',
          href: null,
          method: 'NAV',
          screen: response.redirect_to,
          route: null,
          prompt: null,
        });
        return;
      }
    }
    this.bffResponse = response;
  }
}
