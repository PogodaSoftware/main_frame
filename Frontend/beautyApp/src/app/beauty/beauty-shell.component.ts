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
  ViewChild,
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
import { BeautyProviderMessagesComponent } from './prov-web/beauty-provider-messages.component';
import { BeautyBusinessReviewsComponent } from './beauty-business-reviews.component';
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
import { AdminPortalSignInComponent } from './admin-portal/admin-portal-signin.component';
import { AdminPortal2FAComponent } from './admin-portal/admin-portal-2fa.component';
import { AdminPortalMagicLinkComponent } from './admin-portal/admin-portal-magic.component';
import { AdminPortalIpWarningComponent } from './admin-portal/admin-portal-ip-warning.component';
import { AdminPortalDashboardComponent } from './admin-portal/admin-portal-dashboard.component';
import { AdminPortalDashboardV2Component } from './admin-portal/admin-portal-dashboard-v2.component';
import { AdminPortalCrmListComponent } from './admin-portal/admin-portal-crm-list.component';
import { AdminPortalTagManagerComponent } from './admin-portal/admin-portal-tag-manager.component';
import { AdminPortalSuspendConfirmComponent } from './admin-portal/admin-portal-suspend-confirm.component';
import { AdminPortalCustomerDetailComponent } from './admin-portal/admin-portal-customer-detail.component';
import { AdminPortalProviderDetailComponent } from './admin-portal/admin-portal-provider-detail.component';
import { AdminPortalBookingsLedgerComponent } from './admin-portal/admin-portal-bookings-ledger.component';
import { AdminPortalBookingDetailComponent } from './admin-portal/admin-portal-booking-detail.component';
import { AdminPortalTicketsComponent } from './admin-portal/admin-portal-tickets.component';
import { AdminPortalTeamComponent } from './admin-portal/admin-portal-team.component';
import { AdminPortalAuditLogComponent } from './admin-portal/admin-portal-audit.component';
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
    AdminPortalSignInComponent,
    AdminPortal2FAComponent,
    AdminPortalMagicLinkComponent,
    AdminPortalIpWarningComponent,
    AdminPortalDashboardComponent,
    AdminPortalDashboardV2Component,
    AdminPortalCrmListComponent,
    AdminPortalTagManagerComponent,
    AdminPortalSuspendConfirmComponent,
    AdminPortalCustomerDetailComponent,
    AdminPortalProviderDetailComponent,
    AdminPortalBookingsLedgerComponent,
    AdminPortalBookingDetailComponent,
    AdminPortalTicketsComponent,
    AdminPortalTeamComponent,
    AdminPortalAuditLogComponent,
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
    BeautyProviderMessagesComponent,
    BeautyBusinessReviewsComponent,
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
        [links]="bffResponse!._links ?? {}"
        (toggleFlag)="onFlagToggle($event)"
        (followLink)="followLink($event)"
        (goHomeRequested)="goHome()"
      />
      <app-beauty-admin-crm
        *ngIf="bffResponse!.screen === 'beauty_admin_crm'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-admin-portal-signin
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_signin'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        [errorMessage]="adminPortalSigninError"
        (submitLogin)="onAdminPortalSignin($event)"
        (followLink)="followLink($event)"
      />
      <app-admin-portal-2fa
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_2fa'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        [errorMessage]="adminPortal2faError"
        (verify)="onAdminPortal2faVerify($event)"
        (followLink)="followLink($event)"
      />
      <app-admin-portal-magic
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_magic'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (send)="onAdminPortalMagicSend($event)"
        (followLink)="followLink($event)"
      />
      <app-admin-portal-ip-warning
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_ip_warning'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-admin-portal-dashboard
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_dashboard'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-admin-portal-dashboard-v2
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_dashboard_v2'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-admin-portal-crm-list
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_crm'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (bulkSuspend)="onAdminPortalBulkSuspend($event)"
        (followLink)="followLink($event)"
      />
      <app-admin-portal-tag-manager
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_tag_manager'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (createTag)="onAdminPortalCreateTag($event)"
        (followLink)="followLink($event)"
      />
      <app-admin-portal-suspend-confirm
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_suspend'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (confirm)="onAdminPortalSuspendConfirm($event)"
        (followLink)="followLink($event)"
      />
      <app-admin-portal-customer-detail
        #adminPortalCustomerDetail
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_customer_detail'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
        (sendMessage)="onAdminPortalSendMessage($event)"
        (saveNote)="onAdminPortalSaveNote($event)"
        (exportAccount)="onAdminPortalExportAccount()"
      />
      <app-admin-portal-tickets
        #adminPortalTickets
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_tickets'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
        (createTicket)="onAdminPortalCreateTicket($event)"
        (assignTicket)="onAdminPortalAssignTicket($event)"
        (statusTicket)="onAdminPortalStatusTicket($event)"
      />
      <app-admin-portal-bookings-ledger
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_bookings'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-admin-portal-booking-detail
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_booking_detail'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-admin-portal-provider-detail
        #adminPortalProviderDetail
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_provider_detail'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
        (sendMessage)="onAdminPortalProviderSendMessage($event)"
        (saveNote)="onAdminPortalProviderSaveNote($event)"
        (exportAccount)="onAdminPortalExportAccount()"
      />
      <app-admin-portal-team
        #adminPortalTeam
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_team'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
        (inviteAdmin)="onAdminPortalInviteAdmin($event)"
        (changeRole)="onAdminPortalChangeRole($event)"
        (revokeAdmin)="onAdminPortalRevokeAdmin($event)"
      />
      <app-admin-portal-audit
        *ngIf="bffResponse!.screen === 'beauty_admin_portal_audit'"
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
      <app-beauty-provider-messages
        *ngIf="bffResponse!.screen === 'beauty_business_messages'"
        [data]="bffResponse!.data ?? {}"
        [links]="bffResponse!._links ?? {}"
        (followLink)="followLink($event)"
      />
      <app-beauty-business-reviews
        *ngIf="bffResponse!.screen === 'beauty_business_reviews'"
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
  @ViewChild('adminPortalCustomerDetail') adminPortalCustomerDetailRef?: AdminPortalCustomerDetailComponent;
  @ViewChild('adminPortalProviderDetail') adminPortalProviderDetailRef?: AdminPortalProviderDetailComponent;
  @ViewChild('adminPortalTickets') adminPortalTicketsRef?: AdminPortalTicketsComponent;
  @ViewChild('adminPortalTeam') adminPortalTeamRef?: AdminPortalTeamComponent;
  adminPortalSigninError: string | null = null;
  adminPortal2faError: string | null = null;

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
    this.routeSub = combineLatest([this.route.data, this.route.paramMap, this.route.queryParamMap])
      .pipe(
        switchMap(([data, paramMap, queryParamMap]) => {
          this.currentScreen = (data['screen'] as string) || 'beauty_home';
          const params: Record<string, string | number> = {};
          for (const key of paramMap.keys) {
            const value = paramMap.get(key);
            if (value != null) params[key] = value;
          }
          for (const key of queryParamMap.keys) {
            const value = queryParamMap.get(key);
            if (value != null && !(key in params)) params[key] = value;
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
    beauty_admin_portal_signin: '/admin/portal/signin',
    beauty_admin_portal_2fa: '/admin/portal/2fa',
    beauty_admin_portal_magic: '/admin/portal/magic',
    beauty_admin_portal_ip_warning: '/admin/portal/ip-warning',
    beauty_bookings: '/bookings',
    beauty_profile: '/profile',
    beauty_chats: '/chats',
    beauty_favorites: '/saved',
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

  /** Submit handler for /admin/portal/signin — posts to the BFF submit link
   *  and forwards via the link's route on success. On error the resolver
   *  is re-run so the form re-renders with a fresh CSRF state. */
  onAdminPortalSignin(payload: { email: string; password: string }): void {
    const link = this.bffResponse?._links?.['submit'];
    if (!link) return;
    this.adminPortalSigninError = null;
    this.authService.follow(link, payload, true).subscribe({
      next: () => this.navigateToLink(link),
      error: () => { this.adminPortalSigninError = 'Invalid email or password.'; },
    });
  }

  onAdminPortalBulkSuspend(ev: { type: 'customers' | 'providers'; ids: number[] }): void {
    const link = this.bffResponse?._links?.['suspend'];
    if (!link || !ev.ids.length) return;
    const dtype = ev.type === 'customers' ? 'customer' : 'business';
    const pending = ev.ids.map((id) =>
      this.authService.follow(link, { type: dtype, id, suspended: true }, true).toPromise(),
    );
    Promise.all(pending).then(() => this.retry()).catch(() => this.retry());
  }

  onAdminPortalSendMessage(body: string): void {
    const link = this.bffResponse?._links?.['message'];
    if (!link) return;
    this.authService.follow(link, { body }, true).subscribe({
      next: () => this.adminPortalCustomerDetailRef?.messageResult(true),
      error: (e) => this.adminPortalCustomerDetailRef?.messageResult(false, (e?.error?.detail) ?? 'Failed to send.'),
    });
  }

  onAdminPortalSaveNote(body: string): void {
    const link = this.bffResponse?._links?.['note'];
    if (!link) return;
    this.authService.follow(link, { body }, true).subscribe({
      next: () => { this.adminPortalCustomerDetailRef?.noteResult(true); this.retry(); },
      error: (e) => this.adminPortalCustomerDetailRef?.noteResult(false, (e?.error?.detail) ?? 'Failed to save.'),
    });
  }

  onAdminPortalProviderSendMessage(body: string): void {
    const link = this.bffResponse?._links?.['message'];
    if (!link) return;
    this.authService.follow(link, { body }, true).subscribe({
      next: () => this.adminPortalProviderDetailRef?.messageResult(true),
      error: (e) => this.adminPortalProviderDetailRef?.messageResult(false, (e?.error?.detail) ?? 'Failed to send.'),
    });
  }

  onAdminPortalProviderSaveNote(body: string): void {
    const link = this.bffResponse?._links?.['note'];
    if (!link) return;
    this.authService.follow(link, { body }, true).subscribe({
      next: () => { this.adminPortalProviderDetailRef?.noteResult(true); this.retry(); },
      error: (e) => this.adminPortalProviderDetailRef?.noteResult(false, (e?.error?.detail) ?? 'Failed to save.'),
    });
  }

  onAdminPortalCreateTicket(payload: { subject: string; priority: string; category: string; source: string; body: string }): void {
    const link = this.bffResponse?._links?.['create'];
    if (!link) return;
    this.authService.follow(link, payload, true).subscribe({
      next: () => { this.adminPortalTicketsRef?.createResult(true); this.retry(); },
      error: (e) => this.adminPortalTicketsRef?.createResult(false, (e?.error?.detail) ?? 'Failed.'),
    });
  }

  onAdminPortalAssignTicket(ev: { id: number; assignee_email: string }): void {
    const tmpl = this.bffResponse?._links?.['assign_template'];
    if (!tmpl) return;
    const link: BffLink = { ...tmpl, href: (tmpl.href || '').replace(':id', String(ev.id)) };
    this.authService.follow(link, { assignee_email: ev.assignee_email }, true).subscribe({
      next: () => this.retry(),
      error: () => this.retry(),
    });
  }

  onAdminPortalStatusTicket(ev: { id: number; status: string }): void {
    const tmpl = this.bffResponse?._links?.['status_template'];
    if (!tmpl) return;
    const link: BffLink = { ...tmpl, href: (tmpl.href || '').replace(':id', String(ev.id)) };
    this.authService.follow(link, { status: ev.status }, true).subscribe({
      next: () => this.retry(),
      error: () => this.retry(),
    });
  }

  onAdminPortalExportAccount(): void {
    const link = this.bffResponse?._links?.['export'];
    if (!link?.href) return;
    if (typeof window !== 'undefined') {
      // Open in new tab so HttpOnly cookies still authenticate the GET.
      window.open(link.href, '_blank');
    }
  }

  onAdminPortalSuspendConfirm(payload: { type: 'customer' | 'business'; id: number; reason: string; suspended: boolean }): void {
    const link = this.bffResponse?._links?.['submit'];
    if (!link) return;
    this.authService.follow(link, {
      type: payload.type, id: payload.id, suspended: payload.suspended, reason: payload.reason,
    }, true).subscribe({
      next: () => this.navigateToLink(link),
      error: () => this.navigateToLink(link),
    });
  }

  onAdminPortalCreateTag(payload: { label: string; color: string; tone: string }): void {
    const link = this.bffResponse?._links?.['create'];
    if (!link) return;
    this.authService.follow(link, payload, true).subscribe({
      next: () => this.retry(),
      error: () => { /* swallow; client-side validation already caught most */ },
    });
  }

  onAdminPortalMagicSend(email: string): void {
    const link = this.bffResponse?._links?.['send'];
    if (!link) return;
    this.authService.follow(link, { email }, true).subscribe({
      next: () => { /* success-card already visible */ },
      error: () => { /* visual stub */ },
    });
  }

  onAdminPortalInviteAdmin(payload: { email: string; role: string }): void {
    const link = this.bffResponse?._links?.['invite'];
    if (!link) return;
    this.authService.follow(link, payload, true).subscribe({
      next: () => { this.adminPortalTeamRef?.inviteResult(true); this.retry(); },
      error: (e) => this.adminPortalTeamRef?.inviteResult(false, (e?.error?.detail) ?? 'Failed to send invite.'),
    });
  }

  onAdminPortalChangeRole(ev: { principal_id: number; role: string }): void {
    const tmpl = this.bffResponse?._links?.['role_template'];
    if (!tmpl) return;
    const link: BffLink = { ...tmpl, href: (tmpl.href || '').replace(':id', String(ev.principal_id)) };
    this.authService.follow(link, { role: ev.role }, true).subscribe({
      next: () => { this.adminPortalTeamRef?.roleResult(true); this.retry(); },
      error: (e) => this.adminPortalTeamRef?.roleResult(false, (e?.error?.detail) ?? 'Failed to update role.'),
    });
  }

  onAdminPortalRevokeAdmin(ev: { principal_id: number; email: string }): void {
    const tmpl = this.bffResponse?._links?.['revoke_template'];
    if (!tmpl) return;
    const link: BffLink = { ...tmpl, href: (tmpl.href || '').replace(':id', String(ev.principal_id)) };
    if (typeof window !== 'undefined') {
      const ok = window.confirm(`Revoke admin access for ${ev.email}?`);
      if (!ok) return;
    }
    this.authService.follow(link, {}, true).subscribe({
      next: () => this.retry(),
      error: (e) => this.adminPortalTeamRef?.roleResult(false, (e?.error?.detail) ?? 'Failed to revoke.'),
    });
  }

  onAdminPortal2faVerify(code: string): void {
    const link = this.bffResponse?._links?.['submit'];
    if (!link) return;
    this.adminPortal2faError = null;
    this.authService.follow(link, { code }, true).subscribe({
      next: () => this.navigateToLink(link),
      error: () => { this.adminPortal2faError = 'Invalid code. Try again.'; },
    });
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
