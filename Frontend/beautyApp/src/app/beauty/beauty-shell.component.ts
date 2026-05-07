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
import { BeautyBusinessSignupComponent } from './beauty-business-signup.component';
import { BeautyBusinessApplicationComponent } from './beauty-business-application.component';
import { BeautyBusinessHomeComponent } from './beauty-business-home.component';
import { WizardData } from './beauty-business-application.types';
import { BeautyWireframeComponent } from './wireframe.component';
import { BeautyCategoryComponent } from './beauty-category.component';
import { BeautyProviderDetailComponent } from './beauty-provider-detail.component';
import { BeautyBookComponent } from './beauty-book.component';
import { BeautyBookingsComponent } from './beauty-bookings.component';
import { BeautyBookingSuccessComponent } from './beauty-booking-success.component';
import { BeautyBookingDetailComponent } from './beauty-booking-detail.component';
import { BeautyRescheduleComponent } from './beauty-reschedule.component';
import { BeautyProfileComponent } from './beauty-profile.component';
import { BeautyChatsComponent } from './beauty-chats.component';
import { BeautyChatThreadComponent } from './beauty-chat-thread.component';
import { BeautyBusinessDashboardComponent } from './beauty-business-dashboard.component';
import { BeautyBusinessServicesComponent } from './beauty-business-services.component';
import { BeautyBusinessServiceFormComponent } from './beauty-business-service-form.component';
import { BeautyBusinessAvailabilityComponent } from './beauty-business-availability.component';
import { BeautyBusinessBookingsComponent } from './beauty-business-bookings.component';
import { BeautyBusinessSettingsComponent } from './beauty-business-settings.component';
import { BeautyBusinessChangePasswordComponent } from './beauty-business-change-password.component';
import { BeautyBusinessProfileComponent } from './beauty-business-profile.component';
import { BeautyBusinessEmailContactComponent } from './beauty-business-email-contact.component';
import { BeautyProviderNewMessageToastComponent } from './provider/beauty-provider-new-message-toast.component';
import { BeautyProviderToastService, ToastPayload } from './provider/beauty-provider-toast.service';
import {
  AdminFlag,
  AdminFlagAuditEntry,
  BeautyAdminFlagsComponent,
  FlagToggleEvent,
} from './beauty-admin-flags.component';
import { BeautyAdminCrmComponent } from './beauty-admin-crm.component';
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
    BeautyBusinessSignupComponent,
    BeautyBusinessApplicationComponent,
    BeautyBusinessHomeComponent,
    BeautyWireframeComponent,
    BeautyAdminFlagsComponent,
    BeautyAdminCrmComponent,
    BeautyCategoryComponent,
    BeautyProviderDetailComponent,
    BeautyBookComponent,
    BeautyBookingsComponent,
    BeautyBookingSuccessComponent,
    BeautyBookingDetailComponent,
    BeautyRescheduleComponent,
    BeautyProfileComponent,
    BeautyChatsComponent,
    BeautyChatThreadComponent,
    BeautyBusinessDashboardComponent,
    BeautyBusinessServicesComponent,
    BeautyBusinessServiceFormComponent,
    BeautyBusinessAvailabilityComponent,
    BeautyBusinessBookingsComponent,
    BeautyBusinessSettingsComponent,
    BeautyBusinessChangePasswordComponent,
    BeautyBusinessProfileComponent,
    BeautyBusinessEmailContactComponent,
    BeautyProviderNewMessageToastComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <app-prov-new-message-toast
      (reply)="onToastReply($event)"
      (markRead)="onToastMarkRead($event)"></app-prov-new-message-toast>

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
      <app-beauty-business-signup
        *ngIf="bffResponse!.screen === 'beauty_business_signup'"
        [form]="bffResponse!.form ?? null"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-business-application
        *ngIf="isWizardScreen(bffResponse!.screen)"
        [data]="asWizardData(bffResponse!.data)"
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
      <app-beauty-admin-crm
        *ngIf="bffResponse!.screen === 'beauty_admin_crm'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
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
      <app-beauty-chats
        *ngIf="bffResponse!.screen === 'beauty_chats'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-chat-thread
        *ngIf="bffResponse!.screen === 'beauty_chat_thread'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-business-home
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
      <app-beauty-business-settings
        *ngIf="bffResponse!.screen === 'beauty_business_settings'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-business-change-password
        *ngIf="bffResponse!.screen === 'beauty_business_change_password'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-business-profile
        *ngIf="bffResponse!.screen === 'beauty_business_profile'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-business-email-contact
        *ngIf="bffResponse!.screen === 'beauty_business_email_contact'"
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
    private toastService: BeautyProviderToastService,
  ) {
    if (typeof window !== 'undefined') {
      // dev hook for Playwright verification of msg-toast-* artboards
      (window as unknown as { beautyToastSvc?: BeautyProviderToastService }).beautyToastSvc = toastService;
    }
  }

  onToastReply(p: ToastPayload): void {
    this.followLink({
      rel: 'reply', href: null, method: 'NAV',
      screen: 'beauty_chat_thread',
      route: `/business/messages/${p.conversationId}`,
      prompt: 'Reply',
    });
  }

  onToastMarkRead(_p: ToastPayload): void { /* future: PATCH read link */ }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading = false;
      return;
    }

    // Best-effort cookie rotation at startup if the BFF treats us as
    // authenticated. We don't gate the UI on the result — if the user
    // is already logged out, isAuthenticated() returns false and the
    // refresh is skipped (and would 401 anyway).
    this.authService.isAuthenticated().subscribe((isAuthed) => {
      if (isAuthed) {
        this.authService.maybeRefreshSession().subscribe();
      }
    });

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
    beauty_home: '/',
    beauty_login: '/login',
    beauty_signup: '/signup',
    beauty_business_login: '/business/login',
    beauty_business_signup: '/business/signup',
    beauty_business_application_entity: '/business/apply/entity',
    beauty_business_application_services: '/business/apply/services',
    beauty_business_application_stripe: '/business/apply/stripe',
    beauty_business_application_schedule: '/business/apply/schedule',
    beauty_business_application_tools: '/business/apply/tools',
    beauty_business_application_review: '/business/apply/review',
    beauty_wireframe: '/wireframe',
    beauty_admin_flags: '/admin/flags',
    beauty_admin_crm: '/admin/crm',
    beauty_bookings: '/bookings',
    beauty_profile: '/profile',
    beauty_chats: '/chats',
    // beauty_reschedule and beauty_booking_detail are param routes — the
    // BFF always supplies a substituted `route`, so no fallback entry.
    beauty_business_home: '/business',
    beauty_business_services: '/business/services',
    beauty_business_availability: '/business/availability',
    beauty_business_bookings: '/business/bookings',
    beauty_business_settings: '/business/settings',
    beauty_business_change_password: '/business/settings/password',
    beauty_business_email_contact: '/business/settings/contact',
    beauty_business_profile: '/business/profile',
  };

  /**
   * Normalize a route string coming from the BFF. The BFF emits full paths
   * like /pogoda/beauty/login; strip that prefix so the standalone beauty
   * router (whose routes are app-local: login, signup, …) handles them.
   */
  private normalizeBffRoute(route: string): string {
    return route.replace(/^\/pogoda\/beauty/, '') || '/';
  }

  private navigateToLink(link: BffLink): void {
    const rawRoute =
      link.route ||
      (link.screen
        ? BeautyShellComponent.SCREEN_FALLBACK_ROUTES[link.screen] ?? null
        : null);

    if (rawRoute) {
      const targetRoute = this.normalizeBffRoute(rawRoute);
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
    this.router.navigateByUrl('/');
  }

  private static readonly WIZARD_SCREENS = new Set([
    'beauty_business_application_entity',
    'beauty_business_application_services',
    'beauty_business_application_stripe',
    'beauty_business_application_schedule',
    'beauty_business_application_tools',
    'beauty_business_application_review',
  ]);

  isWizardScreen(screen: string | undefined): boolean {
    return !!screen && BeautyShellComponent.WIZARD_SCREENS.has(screen);
  }

  asWizardData(data: Record<string, unknown> | undefined | null): WizardData | null {
    return (data as unknown as WizardData) || null;
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
