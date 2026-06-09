/**
 * BeautyErrorComponent
 * --------------------
 * Customer-web error states in three variants — generic (5xx), notfound (404),
 * offline (no network) — per design `WebCustomerError`: a centred, chrome-less
 * card (white icon disc, eyebrow, display title, body, primary CTA, and a
 * Contact-support link on the generic variant). Variant comes from the route
 * data, so one component backs /error, /not-found and /offline. RN untouched.
 */

import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

type ErrorVariant = 'generic' | 'notfound' | 'offline';

interface VariantCopy { eyebrow: string; title: string; body: string; cta: string; }

const COPY: Record<ErrorVariant, VariantCopy> = {
  generic: {
    eyebrow: 'Something went wrong',
    title: 'We hit a snag.',
    body: "An unexpected error occurred. Try refreshing the page — if it keeps happening, drop us a note and we'll look into it.",
    cta: 'Refresh',
  },
  notfound: {
    eyebrow: '404',
    title: "We couldn't find that page.",
    body: 'Sometimes things move around. Head home or search for what you were after.',
    cta: 'Back home',
  },
  offline: {
    eyebrow: 'No connection',
    title: "You're offline.",
    body: "Your bookings are saved on this device — they'll sync when you're back online.",
    cta: 'Try again',
  },
};

@Component({
  selector: 'app-beauty-error',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="err-wrap">
      <div class="err-card" role="alert">
        <div class="err-disc" aria-hidden="true">
          <svg *ngIf="variant === 'offline'" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M9 12a4 4 0 0 1 6 0M5 8a8 8 0 0 1 9.5-1.4M1 5a12 12 0 0 1 15-3M12 20h.01"/></svg>
          <svg *ngIf="variant === 'notfound'" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M8 11h6"/></svg>
          <svg *ngIf="variant === 'generic'" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>
        </div>
        <div class="err-eyebrow">{{ copy.eyebrow }}</div>
        <h1 class="err-title">{{ copy.title }}</h1>
        <p class="err-body">{{ copy.body }}</p>
        <div class="err-actions">
          <button type="button" class="btn btn--primary btn--lg" (click)="primary()">{{ copy.cta }}</button>
          <button type="button" class="btn btn--secondary btn--lg" *ngIf="variant === 'generic'" (click)="contactSupport()">Contact support</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --ink: #0A0A0B; --ink-soft: #1F1F22; --accent-blue-deep: #7DA8CF;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      min-height: 100dvh; display: grid; place-items: center;
      background: var(--surface); color: var(--text); font-family: var(--font-body);
    }
    * { box-sizing: border-box; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .err-wrap { width: 100%; display: grid; place-items: center; padding: 24px; }
    .err-card { max-width: 540px; padding: 40px; text-align: center; }
    .err-disc { width: 96px; height: 96px; border-radius: 50%; background: #fff; border: 1px solid var(--line); margin: 0 auto 22px; display: grid; place-items: center; }
    .err-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--text-muted); }
    .err-title { margin: 8px 0 0; font-family: var(--font-display); font-size: 44px; font-weight: 500; line-height: 1.1; }
    .err-body { margin-top: 14px; font-size: 14px; color: var(--text-muted); line-height: 1.55; }
    .err-actions { margin-top: 24px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

    .btn { display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; font-family: var(--font-body); font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: background 150ms ease, border-color 150ms ease; }
    .btn--lg { height: 48px; padding: 0 22px; font-size: 15px; }
    .btn--primary { background: var(--ink); color: #fff; border-color: var(--ink); }
    .btn--primary:hover { background: var(--ink-soft); border-color: var(--ink-soft); }
    .btn--secondary { background: #fff; color: var(--text); border-color: var(--line); }
    .btn--secondary:hover { border-color: var(--accent-blue-deep); }

    @media (max-width: 560px) {
      .err-card { padding: 24px; }
      .err-title { font-size: 34px; }
      .err-actions { flex-direction: column; }
      .btn--lg { width: 100%; }
    }
  `],
})
export class BeautyErrorComponent implements OnInit {
  @Input() variant: ErrorVariant = 'generic';
  copy: VariantCopy = COPY.generic;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const fromRoute = (this.route.snapshot.data['variant'] as ErrorVariant | undefined) || null;
    const v: ErrorVariant = fromRoute || this.variant || 'generic';
    this.variant = v;
    this.copy = COPY[v] || COPY.generic;
  }

  primary(): void {
    if (this.variant === 'notfound') { this.goHome(); return; }
    if (typeof window !== 'undefined') window.location.reload();
  }
  goHome(): void { this.router.navigate(['/']); }
  contactSupport(): void { if (typeof window !== 'undefined') window.location.href = 'mailto:support@example.com'; }
}
