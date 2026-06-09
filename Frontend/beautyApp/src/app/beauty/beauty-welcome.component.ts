/**
 * BeautyWelcomeComponent
 * ----------------------
 * Pre-app landing for unauthenticated users. Desktop split-pane (brand hero
 * left, choices right) per the customer-web design `CustAuthWelcome`;
 * collapses to single-column on mobile via CustAuthLayoutComponent.
 * Choose Continue with Google / Apple, or email sign-in / create account.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { CustAuthLayoutComponent } from './cust-web/cust-auth-layout.component';

@Component({
  selector: 'app-beauty-welcome',
  standalone: true,
  imports: [CommonModule, CustAuthLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="sr-only">Welcome to Beauty</h1>
    <app-cust-auth-layout
      title="Welcome"
      sub="Sign in to your account, or create one in 30 seconds."
      [center]="true"
    >
      <div class="stack">
        <button type="button" class="social" (click)="goGoogle()" data-testid="welcome-google">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M22 12c0-.7-.06-1.4-.2-2H12v3.8h5.6c-.25 1.4-1 2.6-2.1 3.4v2.8h3.4c2-1.8 3.1-4.5 3.1-7.7z" fill="#4285F4"/>
            <path d="M12 22c2.8 0 5.2-1 7-2.7l-3.4-2.6c-1 .6-2.2 1-3.6 1-2.8 0-5.1-1.9-6-4.4H2.5v2.7C4.3 19.6 7.9 22 12 22z" fill="#34A853"/>
            <path d="M6 13.3c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V6.6H2.5C1.8 8 1.5 9.5 1.5 11.3s.4 3.3 1 4.7L6 13.3z" fill="#FBBC04"/>
            <path d="M12 5.4c1.6 0 3 .6 4.1 1.6L19 4.1C17.2 2.4 14.8 1.5 12 1.5c-4.1 0-7.7 2.4-9.5 5.8L6 9.3c.9-2.5 3.2-4.4 6-4.4z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>
        <button type="button" class="social social--ink" (click)="goApple()" data-testid="welcome-apple">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zm-7.05-17C9.15 1.9 10.69.83 12.17.6c.13 1.45-.43 2.86-1.34 3.86-.88 1-2.32 1.75-3.55 1.65-.17-1.41.51-2.86 1.72-3.83z"/></svg>
          <span>Continue with Apple</span>
        </button>

        <div class="divider"><span></span><em>or email</em><span></span></div>

        <button type="button" class="btn btn--primary" (click)="goLogin()" data-testid="welcome-signin">Sign in with email</button>
        <button type="button" class="btn btn--secondary" (click)="goSignup()" data-testid="welcome-signup">Create an account</button>
      </div>

      <div cust-auth-footer>
        By continuing you agree to our
        <button type="button" class="legal-link" (click)="openLegal('terms')">Terms</button> and
        <button type="button" class="legal-link" (click)="openLegal('privacy')">Privacy</button>.
      </div>
    </app-cust-auth-layout>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77; --ink: #0A0A0B;
      --font-body: 'Inter', system-ui, sans-serif;
      display: block; min-height: 100dvh;
    }
    * { box-sizing: border-box; }
    .stack { display: flex; flex-direction: column; gap: 10px; }

    .social {
      height: 52px; border-radius: 12px; background: #fff; border: 1px solid var(--ink);
      font-family: var(--font-body); font-size: 14px; font-weight: 600; color: var(--text);
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 0 16px;
    }
    .social span { text-align: center; }
    .social--ink { background: var(--ink); border-color: var(--ink); color: #fff; }
    .social:hover { background: #FAFAFA; }
    .social--ink:hover { background: #1F1F22; }

    .divider { display: flex; align-items: center; gap: 10px; margin: 8px 0; }
    .divider span { flex: 1; height: 1px; background: var(--line); }
    .divider em { font-style: normal; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.2px; }

    .btn {
      width: 100%; height: 44px; border-radius: 10px;
      font-family: var(--font-body); font-size: 14px; font-weight: 600; letter-spacing: .2px;
      cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    }
    .btn--primary { background: var(--ink); color: #fff; border: 1px solid var(--ink); }
    .btn--primary:hover { background: #1F1F22; }
    .btn--secondary { background: #fff; color: var(--text); border: 1px solid var(--line); }
    .btn--secondary:hover { border-color: #7DA8CF; }

    .legal-link { color: #0F1115; font-weight: 600; background: none; border: none; padding: 0; cursor: pointer; font: inherit; }
    .legal-link:hover { text-decoration: underline; }

    .sr-only { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0,0,0,0) !important; white-space: nowrap !important; border: 0 !important; }
    @media (prefers-reduced-motion: reduce) { .social, .btn { transition: none; } }
  `],
})
export class BeautyWelcomeComponent {
  constructor(private router: Router) {}

  goLogin(): void { this.router.navigate(['/login']); }
  goSignup(): void { this.router.navigate(['/signup']); }
  goGoogle(): void { this.router.navigate(['/auth/oauth/google']); }
  // No Apple OAuth backend yet — fall back to email sign-in.
  goApple(): void { this.router.navigate(['/login']); }
  openLegal(_kind: 'terms' | 'privacy'): void { /* no-op until legal pages exist */ }
}
