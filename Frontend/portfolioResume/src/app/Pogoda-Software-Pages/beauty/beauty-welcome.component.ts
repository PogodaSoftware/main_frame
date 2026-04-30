/**
 * BeautyWelcomeComponent
 * ----------------------
 * Pre-app landing for unauthenticated users. Choose Sign in,
 * Create account, or Continue with Google. Matches the design
 * system AuthWelcomePage (sparkle wordmark, baby-blue hero,
 * green primary CTA, black secondary, ghost google button).
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-beauty-welcome',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="welcome-page">
      <h1 class="sr-only">Welcome to Beauty</h1>
      <main id="main" class="welcome-main">
      <div class="hero">
        <span class="dot dot-a"></span>
        <span class="dot dot-b"></span>
        <span class="dot dot-c"></span>
        <span class="dot dot-d"></span>

        <div class="brand">
          <div class="brand-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
              <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
              <circle cx="19" cy="4" r="1.2" />
              <circle cx="5" cy="19" r="1" />
            </svg>
          </div>
          <div class="brand-name">Beauty</div>
          <div class="brand-tag">Hair, nails, facial &amp; massage — booked in seconds.</div>
        </div>
      </div>

      <div class="actions">
        <button type="button" class="btn-primary" (click)="goLogin()" data-testid="welcome-signin">Sign in</button>
        <button type="button" class="btn-secondary" (click)="goSignup()" data-testid="welcome-signup">Create account</button>

        <div class="divider">
          <span></span><em>or</em><span></span>
        </div>

        <button type="button" class="btn-ghost" (click)="goGoogle()" data-testid="welcome-google">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
            <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
            <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
            <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7C13.42 14.62 18.27 10.75 24 10.75z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div class="legal">
          By continuing you agree to the
          <button type="button" class="legal-link" (click)="openLegal('terms')">Terms</button> and
          <button type="button" class="legal-link" (click)="openLegal('privacy')">Privacy Policy</button>.
        </div>
      </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2;
      --line: #DCDCDF;
      --text: #0F1115;
      --text-muted: #6B6F77;
      --baby-blue: #CFE3F5;
      --baby-blue-deep: #7DA8CF;
      --ink: #0A0A0B;
      --success: #2F7A47;
      --success-hover: #256238;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      display: block;
      min-height: 100dvh;
      background: var(--surface);
      color: var(--text);
      font-family: var(--font-body);
    }
    * { box-sizing: border-box; }

    .welcome-page {
      display: flex; flex-direction: column;
      min-height: 100dvh;
      max-width: 430px; margin: 0 auto;
      padding-bottom: env(safe-area-inset-bottom);
    }

    .hero {
      position: relative;
      flex: 1 1 auto;
      min-height: 380px;
      display: grid; place-items: center;
      background: linear-gradient(180deg, var(--baby-blue) 0%, var(--surface) 100%);
      overflow: hidden;
    }
    .dot { position: absolute; border-radius: 50%; background: var(--baby-blue-deep); }
    .dot-a { top: 30px; left: 40px; width: 4px; height: 4px; opacity: .5; }
    .dot-b { top: 70px; right: 50px; width: 6px; height: 6px; opacity: .35; }
    .dot-c { top: 130px; left: 70px; width: 3px; height: 3px; opacity: .4; }
    .dot-d { top: 50px; right: 90px; width: 3px; height: 3px; opacity: .45; }

    .brand { display: flex; flex-direction: column; align-items: center; gap: 14px; }
    .brand-icon {
      width: 64px; height: 64px; border-radius: 18px;
      background: var(--ink);
      display: grid; place-items: center;
      box-shadow: 0 4px 14px rgba(15, 35, 60, 0.18);
    }
    .brand-name {
      font-family: var(--font-display);
      font-size: 40px; font-weight: 500;
      line-height: 1; letter-spacing: 0.4px;
      color: var(--text);
    }
    .brand-tag {
      font-family: var(--font-body);
      font-size: 13px; color: var(--text-muted);
      text-align: center; max-width: 260px; line-height: 1.4;
    }

    .actions {
      flex: 0 0 auto;
      padding: 24px 24px 12px;
      display: flex; flex-direction: column; gap: 10px;
    }

    .btn-primary, .btn-secondary, .btn-ghost {
      width: 100%; height: 48px; border-radius: 10px;
      font-family: var(--font-body); font-size: 14px; font-weight: 600;
      letter-spacing: .2px; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 10px;
      transition: background-color .15s ease, border-color .15s ease;
    }
    .btn-primary {
      background: var(--success); color: #fff; border: 1px solid var(--success);
      box-shadow: 0 2px 8px rgba(47, 122, 71, 0.2);
    }
    .btn-primary:hover { background: var(--success-hover); border-color: var(--success-hover); }
    .btn-secondary {
      background: var(--ink); color: #fff; border: 1px solid var(--ink);
    }
    .btn-secondary:hover { background: #1F1F22; border-color: #1F1F22; }
    .btn-ghost {
      background: #fff; color: var(--text); border: 1.5px solid var(--line);
    }
    .btn-ghost:hover { border-color: var(--baby-blue-deep); }

    @media (prefers-reduced-motion: reduce) {
      .btn-primary, .btn-secondary, .btn-ghost { transition: none; }
    }

    .divider {
      display: flex; align-items: center; gap: 12px; margin: 10px 0;
    }
    .divider span { flex: 1; height: 1px; background: var(--line); }
    .divider em {
      font-style: normal; font-size: 11px; font-weight: 600;
      color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.2px;
    }

    .legal {
      margin-top: auto;
      padding: 18px 12px 0;
      font-size: 11px; color: var(--text-muted);
      text-align: center; line-height: 1.5;
    }
    .legal-link {
      color: #1a3a52; font-weight: 600; text-decoration: none;
      background: none; border: none; padding: 0; cursor: pointer;
      font: inherit;
    }
    .legal-link:hover { text-decoration: underline; }

    /* a11y: shared focus ring (WCAG 2.4.7) */
    :host *:focus-visible {
      outline: 2px solid #1a3a52;
      outline-offset: 2px;
      border-radius: 6px;
    }

    /* a11y: visually-hidden helper */
    .sr-only {
      position: absolute !important; width: 1px !important; height: 1px !important;
      padding: 0 !important; margin: -1px !important; overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important;
    }

    .welcome-main { display: contents; }
  `],
})
export class BeautyWelcomeComponent {
  constructor(private router: Router) {}

  goLogin(): void {
    this.router.navigate(['/pogoda/beauty/login']);
  }

  goSignup(): void {
    this.router.navigate(['/pogoda/beauty/signup']);
  }

  goGoogle(): void {
    // Google OAuth entrypoint — backend returns redirect.
    // Falls back to login if endpoint not configured.
    this.router.navigate(['/pogoda/beauty/login'], { queryParams: { provider: 'google' } });
  }

  // TODO: route to /legal/terms or /legal/privacy when those pages exist.
  openLegal(_kind: 'terms' | 'privacy'): void {
    // No-op for now — placeholder so screen readers don't announce a broken link.
  }
}
