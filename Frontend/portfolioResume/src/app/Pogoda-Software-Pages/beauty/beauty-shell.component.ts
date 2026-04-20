/**
 * BeautyShellComponent
 * --------------------
 * The single entry point for every /pogoda/beauty/* route.
 *
 * SDUI flow on each navigation:
 *   1. Read the requested screen from the Angular route data.
 *   2. POST /api/bff/beauty/resolve/ → get render/redirect instruction.
 *   3. Render the screen component declared by the BFF response, passing
 *      its data payload as an @Input().
 *   4. Handle events emitted by child components (form success, navigation)
 *      by re-resolving via the BFF — never by reading localStorage.
 *
 * Nothing from the BFF response is stored between renders.
 */

import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { BeautyBffService, BffResponse } from './beauty-bff.service';
import { BeautyAuthService } from './beauty-auth.service';
import { BeautyMainComponent } from './beauty-main.component';
import { BeautyLoginComponent } from './beauty-login.component';
import { BeautySignupComponent } from './beauty-signup.component';
import { BeautyBusinessLoginComponent } from './beauty-business-login.component';

const SCREEN_TO_ROUTE: Record<string, string[]> = {
  beauty_home: ['/pogoda/beauty'],
  beauty_login: ['/pogoda/beauty/login'],
  beauty_signup: ['/pogoda/beauty/signup'],
  beauty_business_login: ['/pogoda/beauty/business/login'],
};

@Component({
  selector: 'app-beauty-shell',
  standalone: true,
  imports: [
    BeautyMainComponent,
    BeautyLoginComponent,
    BeautySignupComponent,
    BeautyBusinessLoginComponent,
  ],
  template: `
    @if (isLoading) {
      <div class="shell-loading">
        <div class="shell-spinner"></div>
      </div>
    } @else if (serverError) {
      <div class="shell-error">
        <p>Unable to load. Please try again.</p>
        <button (click)="retry()">Retry</button>
      </div>
    } @else if (bffResponse?.action === 'render') {
      @switch (bffResponse!.screen) {
        @case ('beauty_home') {
          <app-beauty-main
            [data]="bffResponse!.data ?? {}"
            (navigate)="navigateTo($event)"
            (logout)="handleLogout()"
          />
        }
        @case ('beauty_login') {
          <app-beauty-login
            [data]="bffResponse!.data ?? {}"
            (loginSuccess)="handleAuthSuccess('beauty_home')"
            (navigate)="navigateTo($event)"
          />
        }
        @case ('beauty_signup') {
          <app-beauty-signup
            [data]="bffResponse!.data ?? {}"
            (signupSuccess)="handleAuthSuccess('beauty_home')"
            (navigate)="navigateTo($event)"
          />
        }
        @case ('beauty_business_login') {
          <app-beauty-business-login
            [data]="bffResponse!.data ?? {}"
            (loginSuccess)="handleAuthSuccess('beauty_home')"
            (navigate)="navigateTo($event)"
          />
        }
      }
    }
  `,
  styles: [`
    .shell-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      background: #ffffff;
    }
    .shell-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e0e0e0;
      border-top-color: #000000;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .shell-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      gap: 16px;
      font-family: -apple-system, sans-serif;
      color: #212121;
    }
    .shell-error button {
      padding: 10px 24px;
      background: #000;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
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

  navigateTo(screen: string): void {
    const route = SCREEN_TO_ROUTE[screen];
    if (route) {
      this.router.navigate(route);
    }
  }

  handleAuthSuccess(targetScreen: string): void {
    this.navigateTo(targetScreen);
  }

  handleLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.navigateTo('beauty_home'),
      error: () => this.navigateTo('beauty_home'),
    });
  }

  private applyResponse(response: BffResponse): void {
    this.isLoading = false;
    if (response.action === 'redirect' && response.redirect_to) {
      this.navigateTo(response.redirect_to);
      return;
    }
    this.bffResponse = response;
  }
}
