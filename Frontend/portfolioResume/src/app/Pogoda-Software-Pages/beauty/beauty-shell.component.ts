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
import { of, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { BeautyBffService } from './beauty-bff.service';
import { BeautyAuthService } from './beauty-auth.service';
import { BeautyMainComponent } from './beauty-main.component';
import { BeautyLoginComponent } from './beauty-login.component';
import { BeautySignupComponent } from './beauty-signup.component';
import { BeautyBusinessLoginComponent } from './beauty-business-login.component';
import { BeautyWireframeComponent } from './wireframe.component';
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

  private currentScreen = 'beauty_home';
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

    this.routeSub = this.route.data
      .pipe(
        switchMap((data) => {
          this.currentScreen = (data['screen'] as string) || 'beauty_home';
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

          return this.bffService.resolve(this.currentScreen);
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
    this.bffService.resolve(this.currentScreen).subscribe({
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
  };

  private navigateToLink(link: BffLink): void {
    if (link.route) {
      this.router.navigateByUrl(link.route);
      return;
    }
    if (link.screen) {
      const fallback = BeautyShellComponent.SCREEN_FALLBACK_ROUTES[link.screen];
      if (fallback) {
        this.router.navigateByUrl(fallback);
        return;
      }
    }
    // Last resort: re-resolve the current screen.
    this.retry();
  }

  private applyResponse(response: BffResponse): void {
    this.isLoading = false;
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
