/**
 * BeautyErrorComponent
 * --------------------
 * Renders the design system's error page in three variants:
 * generic (5xx fallback), notfound (404), and offline (no network).
 * Variant is sourced from the route data, so a single component
 * backs all three routes.
 */

import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

type ErrorVariant = 'generic' | 'notfound' | 'offline';

interface VariantCopy {
  eyebrow: string;
  title: string;
  body: string;
  code: string;
}

const COPY: Record<ErrorVariant, VariantCopy> = {
  generic: {
    eyebrow: 'Something went wrong',
    title: 'We hit a snag',
    body: "Don't worry — your bookings and account are safe. Give it another try, or head back home.",
    code: 'ERR_5XX · session preserved',
  },
  notfound: {
    eyebrow: 'Page not found',
    title: "We can't find that page",
    body: "The link may be broken, or the page may have moved. Let's get you back somewhere familiar.",
    code: 'ERR_404 · /unknown',
  },
  offline: {
    eyebrow: 'No connection',
    title: "You're offline",
    body: 'Check your Wi-Fi or cellular signal. Your draft booking has been saved locally.',
    code: 'ERR_NET · retrying…',
  },
};

@Component({
  selector: 'app-beauty-error',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error-page">
      <header class="sub-header">
        <button
          type="button"
          class="back-btn"
          aria-label="Back"
          (click)="goBack()"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="sub-header-title">{{ copy.eyebrow }}</span>
        <span class="sub-header-spacer"></span>
      </header>

      <main id="main" class="error-main">
        <div class="err-sparkle">
          <div class="err-sparkle-ring"></div>
          <svg viewBox="0 0 24 24" fill="none" stroke="#1a3a52" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <ng-container *ngIf="variant === 'offline'; else otherIcon">
              <path d="M3 9a14 14 0 0 1 18 0"/>
              <path d="M6 12.5a10 10 0 0 1 12 0"/>
              <path d="M9 16a6 6 0 0 1 6 0"/>
              <circle cx="12" cy="19" r="0.6" fill="#1a3a52" stroke="none"/>
              <line x1="3" y1="3" x2="21" y2="21" stroke="#C0392B" stroke-width="1.6"/>
            </ng-container>
            <ng-template #otherIcon>
              <ng-container *ngIf="variant === 'notfound'; else genericIcon">
                <circle cx="12" cy="12" r="9"/>
                <path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>
              </ng-container>
              <ng-template #genericIcon>
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7.5v5"/>
                <circle cx="12" cy="16" r="0.6" fill="#1a3a52" stroke="none"/>
              </ng-template>
            </ng-template>
          </svg>
        </div>

        <div class="err-eyebrow" role="alert">{{ copy.eyebrow }}</div>
        <h1 class="err-title">{{ copy.title }}</h1>
        <p class="err-body">{{ copy.body }}</p>
        <code class="err-code">{{ copy.code }}</code>

        <div class="err-actions">
          <button type="button" class="btn-secondary" (click)="tryAgain()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7"/>
              <path d="M3 4v5h5"/>
            </svg>
            Try again
          </button>
          <button type="button" class="btn-primary" (click)="goHome()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 11l9-7 9 7v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9z"/>
            </svg>
            Go home
          </button>
        </div>

        <button type="button" class="btn-link" (click)="contactSupport()">Contact support</button>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --baby-blue: #CFE3F5; --baby-blue-deep: #7DA8CF;
      --ink: #0A0A0B; --danger: #C0392B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh;
      background: var(--surface); color: var(--text);
      font-family: var(--font-body);
    }
    * { box-sizing: border-box; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .error-page {
      display: flex; flex-direction: column;
      min-height: 100dvh; max-width: 430px; margin: 0 auto;
    }

    .sub-header {
      display: flex; align-items: center;
      height: 56px; padding: 0 12px;
      background: var(--surface);
      border-bottom: 1px solid var(--line);
      flex-shrink: 0;
    }
    .sub-header-title {
      flex: 1; text-align: center;
      font-size: 0.95rem; font-weight: 600;
      color: var(--text); letter-spacing: 0.2px;
    }
    .sub-header-spacer { width: 36px; height: 36px; flex-shrink: 0; }
    .back-btn {
      min-width: 44px; min-height: 44px; width: 44px; height: 44px; border-radius: 8px;
      background: transparent; border: none; color: var(--text);
      display: grid; place-items: center; cursor: pointer; flex-shrink: 0;
    }
    .back-btn:hover { background: var(--surface-2); }

    .error-main {
      flex: 1;
      padding: 24px 24px 28px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center;
    }

    .err-sparkle {
      position: relative;
      width: 96px; height: 96px; border-radius: 50%;
      background: radial-gradient(circle at 35% 30%, #E8F1FA, #CFE3F5 65%, #B6D2EA);
      display: grid; place-items: center;
      box-shadow: 0 8px 24px rgba(125,168,207,0.30), inset 0 0 0 1px rgba(255,255,255,0.6);
    }
    .err-sparkle-ring {
      position: absolute; inset: 6px; border-radius: 50%;
      border: 1px dashed rgba(125,168,207,0.4);
    }
    .err-sparkle svg { width: 38px; height: 38px; position: relative; z-index: 1; }

    .err-eyebrow {
      font-size: 11px; font-weight: 600; color: #1a3a52;
      text-transform: uppercase; letter-spacing: 1.4px;
      margin-top: 22px; margin-bottom: 8px;
    }
    .err-title {
      font-family: var(--font-display);
      font-size: 34px; font-weight: 500;
      margin: 0 0 10px; letter-spacing: 0.2px; line-height: 1.1;
      max-width: 280px;
    }
    .err-body {
      font-size: 13px; line-height: 1.55; color: var(--text-muted);
      margin: 0 0 22px; max-width: 290px;
    }
    .err-code {
      font-family: var(--font-mono);
      font-size: 11px; color: var(--text-muted);
      background: var(--surface-2);
      padding: 3px 8px; border-radius: 4px;
      border: 1px solid var(--line);
      letter-spacing: 0.4px;
    }

    .err-actions {
      display: flex; gap: 10px;
      margin-top: 28px; width: 100%; max-width: 320px;
    }
    .btn-secondary, .btn-primary {
      flex: 1; height: 46px; border-radius: 12px;
      font-family: var(--font-body);
      font-size: 13px; font-weight: 600; letter-spacing: 0.2px;
      cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      transition: background-color .15s ease, border-color .15s ease;
    }
    .btn-secondary {
      background: #FFFFFF; color: var(--text);
      border: 1px solid var(--line);
    }
    .btn-secondary:hover { border-color: var(--baby-blue-deep); }
    .btn-primary {
      background: var(--ink); color: #fff;
      border: 1px solid var(--ink);
      box-shadow: 0 2px 8px rgba(15,17,21,0.18);
    }
    .btn-primary:hover { background: #1F1F22; border-color: #1F1F22; }

    .btn-link {
      margin-top: 16px;
      background: transparent; border: none; cursor: pointer;
      font-size: 12px; color: var(--text-muted);
      font-family: var(--font-body);
      text-decoration: underline; text-underline-offset: 3px;
    }
    .btn-link:hover { color: var(--text); }
  `],
})
export class BeautyErrorComponent implements OnInit {
  @Input() variant: ErrorVariant = 'generic';

  copy: VariantCopy = COPY.generic;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const fromRoute = (this.route.snapshot.data['variant'] as ErrorVariant | undefined) || null;
    const v: ErrorVariant = fromRoute || this.variant || 'generic';
    this.variant = v;
    this.copy = COPY[v] || COPY.generic;
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.goHome();
    }
  }

  tryAgain(): void {
    if (this.variant === 'notfound') {
      this.goHome();
      return;
    }
    window.location.reload();
  }

  contactSupport(): void {
    window.location.href = 'mailto:support@example.com';
  }
}
