/**
 * BeautyBookingSuccessComponent (Presentational)
 * ----------------------------------------------
 * Confirmation screen rendered after a successful booking. Sparkle
 * disc with check, Cormorant headline, summary card (When / Where /
 * Stylist / Total), confirmation code chip with copy, and HATEOAS
 * action buttons supplied by the BFF (`bookings`, `detail`, `home`).
 */

import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { formatSlotLocal } from './beauty-time.util';
import { BeautyConfirmModalComponent } from './beauty-confirm-modal.component';

interface SuccessBooking {
  id: number;
  status: string;
  slot_at: string;
  slot_label: string;
  grace_period_ends_at?: string | null;
  in_grace_window?: boolean;
  service: {
    id: number;
    name: string;
    price_cents: number;
    duration_minutes: number;
  };
  provider: {
    id: number;
    name: string;
    location_label: string;
    timezone?: string;
  };
}

@Component({
  selector: 'app-beauty-booking-success',
  standalone: true,
  imports: [CommonModule, BeautyConfirmModalComponent],
  template: `
    <div class="beauty-app" *ngIf="booking as b">
      <header class="sub-header">
        <span class="sub-header-spacer"></span>
        <span class="sub-header-title"></span>
        <button
          type="button"
          class="share-btn"
          aria-label="Share"
          (click)="onShare()"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14"/>
          </svg>
        </button>
      </header>

      <main id="main" class="success-main">
        <div class="hero">
          <div class="sparkle-disc">
            <div class="sparkle-ring"></div>
            <svg class="sparkle-check" viewBox="0 0 24 24" fill="none" stroke="#1a3a52" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5"/>
            </svg>
          </div>

          <div class="eyebrow">You're all set</div>
          <h1 class="title">Booking confirmed</h1>
          <p class="body">
            You're booked for <strong>{{ b.service.name }}</strong>
            at <strong>{{ b.provider.name }}</strong>.
          </p>
        </div>

        <section class="summary-card">
          <div class="row">
            <span class="row-label">When</span>
            <span class="row-value">{{ formatLocal(b.slot_at, b.provider?.timezone) || b.slot_label }}</span>
          </div>
          <div class="row">
            <span class="row-label">Where</span>
            <span class="row-value">{{ b.provider.location_label }}</span>
          </div>
          <div class="row">
            <span class="row-label">Stylist</span>
            <span class="row-value">{{ b.provider.name }}</span>
          </div>
          <div class="row last">
            <span class="row-label">Total</span>
            <span class="row-value mono">
              \${{ (b.service.price_cents / 100).toFixed(2) }} · {{ b.service.duration_minutes }} min
            </span>
          </div>
        </section>

        <div class="conf-chip">
          <div class="conf-text">
            <span class="conf-eyebrow">Confirmation</span>
            <code class="conf-code">{{ confirmationCode(b.id) }}</code>
          </div>
          <button type="button" class="conf-copy" (click)="copyCode(b.id)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span aria-live="polite">{{ copied ? 'Copied' : 'Copy' }}</span>
          </button>
        </div>

        <div class="spacer"></div>

        <div class="actions">
          <button
            type="button"
            class="btn-primary"
            (click)="emit(links['bookings'])"
            [disabled]="!links['bookings']"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2.5"/>
              <path d="M3 10h18M8 3v4M16 3v4"/>
            </svg>
            View my bookings
          </button>
          <div class="actions-row">
            <button type="button" class="btn-secondary" (click)="addToCalendar()">
              Add to calendar
            </button>
            <button type="button" class="btn-secondary" (click)="emit(links['home'])" [disabled]="!links['home']">
              Back to home
            </button>
          </div>

          <button
            *ngIf="links['cancel_grace'] && graceSecondsLeft > 0"
            type="button"
            class="btn-grace"
            (click)="askGraceCancel()"
            [disabled]="isCancelling"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 2"/>
            </svg>
            <span>Cancel free</span>
            <span class="grace-pill" aria-live="off" aria-hidden="true">{{ graceCountdownLabel }}</span>
            <span class="sr-only" aria-live="polite">{{ graceExpiredAnnouncement }}</span>
          </button>
          <button
            *ngIf="!graceSecondsLeft && links['cancel_grace']"
            type="button"
            class="btn-cancel-text"
            (click)="askGraceCancel()"
            [disabled]="isCancelling"
          >Cancel booking</button>
          <p
            *ngIf="links['cancel_grace']"
            class="grace-caption"
          >Cancel within 5 minutes of booking and you won't be charged.</p>
        </div>
      </main>

      <app-beauty-confirm-modal
        *ngIf="confirmOpen"
        [open]="confirmOpen"
        [title]="'Cancel without charge?'"
        [body]="'You\\'re still inside the 5-minute grace window — we won\\'t charge you.'"
        [primaryLabel]="'Yes, cancel now'"
        [primaryVariant]="'danger'"
        [secondaryLabel]="'Keep booking'"
        [busy]="isCancelling"
        [busyLabel]="'Cancelling…'"
        (confirmed)="runGraceCancel()"
        (dismissed)="confirmOpen = false"
      />

      <nav class="bottom-nav" aria-label="Primary">
        <button type="button" class="nav-tab is-active" (click)="emit(links['bookings'])" [disabled]="!links['bookings']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2.5"/>
            <path d="M3 10h18M8 3v4M16 3v4"/>
          </svg>
          <span class="nav-label">Bookings</span>
        </button>
        <button type="button" class="nav-tab" (click)="emit(links['home'])" [disabled]="!links['home']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 11l9-7 9 7v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9z"/>
          </svg>
          <span class="nav-label">Home</span>
        </button>
        <button type="button" class="nav-tab" (click)="emit(links['chats'])" [disabled]="!links['chats']" data-testid="nav-chat">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="nav-label">Chat</span>
        </button>
        <button type="button" class="nav-tab" (click)="emit(links['profile'])" [disabled]="!links['profile']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.8"/>
            <path d="M4.5 21c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5"/>
          </svg>
          <span class="nav-label">Profile</span>
        </button>
      </nav>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --baby-blue: #CFE3F5; --baby-blue-deep: #7DA8CF;
      --ink: #0A0A0B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
    }
    * { box-sizing: border-box; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .beauty-app { display: flex; flex-direction: column; min-height: 100dvh; background: var(--surface); font-family: var(--font-body); color: var(--text); }

    .sub-header { display: flex; align-items: center; height: 56px; padding: 0 12px; background: var(--surface); border-bottom: 1px solid var(--line); flex-shrink: 0; }
    .sub-header-title { flex: 1; }
    .sub-header-spacer { width: 36px; height: 36px; flex-shrink: 0; }
    .share-btn { min-width: 44px; min-height: 44px; width: 44px; height: 44px; border-radius: 8px; background: transparent; border: none; color: var(--text); display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
    .share-btn:hover { background: var(--surface-2); }

    .success-main { flex: 1; padding: 8px 20px 16px; display: flex; flex-direction: column; }

    .hero { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 14px 8px 20px; }
    .sparkle-disc {
      position: relative; width: 76px; height: 76px; border-radius: 50%;
      background: radial-gradient(circle at 35% 30%, #E8F1FA, #CFE3F5 65%, #B6D2EA);
      display: grid; place-items: center;
      box-shadow: 0 8px 24px rgba(125,168,207,0.30), inset 0 0 0 1px rgba(255,255,255,0.6);
      margin-bottom: 16px;
    }
    .sparkle-ring { position: absolute; inset: 6px; border-radius: 50%; border: 1px dashed rgba(125,168,207,0.4); }
    .sparkle-check { width: 32px; height: 32px; position: relative; z-index: 1; }

    .eyebrow {
      font-size: 11px; font-weight: 600; color: #1a3a52;
      text-transform: uppercase; letter-spacing: 1.4px; margin-bottom: 6px;
    }
    .title {
      font-family: var(--font-display); font-size: 34px; font-weight: 500;
      margin: 0 0 8px; letter-spacing: 0.2px; line-height: 1.05;
    }
    .body {
      font-size: 13px; line-height: 1.55; color: var(--text-muted);
      margin: 0; max-width: 290px;
    }
    .body strong { color: var(--text); font-weight: 600; }

    .summary-card {
      background: #FFFFFF; border: 1px solid var(--line); border-radius: 14px;
      margin-bottom: 16px; overflow: hidden;
    }
    .row {
      padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;
      border-bottom: 1px solid var(--line);
    }
    .row.last { border-bottom: none; }
    .row-label {
      font-size: 10px; font-weight: 600; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 1.2px;
    }
    .row-value { font-size: 14px; font-weight: 500; color: var(--text); line-height: 1.35; }
    .row-value.mono { font-family: var(--font-mono); }

    .conf-chip {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 10px 14px; border-radius: 12px;
      background: var(--baby-blue);
      border: 1px solid rgba(125,168,207,0.4);
      margin-bottom: 16px;
    }
    .conf-text { display: flex; flex-direction: column; gap: 2px; }
    .conf-eyebrow {
      font-size: 10px; font-weight: 600; color: #1a3a52;
      text-transform: uppercase; letter-spacing: 1.2px; opacity: 0.75;
    }
    .conf-code { font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: #1a3a52; }
    .conf-copy {
      height: 30px; padding: 0 12px; border-radius: 8px;
      background: #FFFFFF; color: #1a3a52;
      border: 1px solid rgba(125,168,207,0.55);
      font-size: 11px; font-weight: 600; cursor: pointer;
      font-family: var(--font-body);
      display: inline-flex; align-items: center; gap: 5px;
    }
    .conf-copy:hover { background: #F4F9FD; }

    .spacer { flex: 1; min-height: 12px; }

    .actions { display: flex; flex-direction: column; gap: 8px; }
    .btn-primary {
      width: 100%; height: 48px; border-radius: 12px;
      background: var(--ink); color: #fff;
      border: 1px solid var(--ink);
      font-size: 14px; font-weight: 600; letter-spacing: 0.2px; cursor: pointer;
      font-family: var(--font-body);
      box-shadow: 0 2px 8px rgba(15,17,21,0.18);
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-primary:hover:not(:disabled) { background: #1F1F22; border-color: #1F1F22; }
    .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
    .actions-row { display: flex; gap: 8px; }
    .btn-secondary {
      flex: 1; height: 44px; border-radius: 12px;
      background: #FFFFFF; color: var(--text);
      border: 1px solid var(--line);
      font-size: 13px; font-weight: 600; letter-spacing: 0.2px; cursor: pointer;
      font-family: var(--font-body);
    }
    .btn-secondary:hover:not(:disabled) { border-color: var(--baby-blue-deep); }
    .btn-secondary:disabled { opacity: 0.55; cursor: not-allowed; }

    .btn-grace {
      width: 100%; height: 44px; border-radius: 12px;
      background: var(--baby-blue);
      color: #1a3a52;
      border: 1px solid rgba(125,168,207,0.5);
      font-family: var(--font-body);
      font-size: 13px; font-weight: 600; letter-spacing: 0.2px; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-grace:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-grace .grace-pill {
      font-family: var(--font-mono); font-size: 12px; font-weight: 600;
      color: #1a3a52; background: #FFFFFF;
      border: 1px solid rgba(125,168,207,0.55);
      padding: 2px 8px; border-radius: 999px;
      min-width: 46px; text-align: center;
    }
    .btn-cancel-text {
      width: 100%; height: 44px; border-radius: 12px;
      background: #FFFFFF; color: #C0392B;
      border: 1px solid var(--line);
      font-family: var(--font-body);
      font-size: 13px; font-weight: 600; letter-spacing: 0.2px; cursor: pointer;
    }
    .btn-cancel-text:hover:not(:disabled) { background: #FCE8E5; }
    .btn-cancel-text:disabled { opacity: 0.55; cursor: not-allowed; }
    .grace-caption {
      font-size: 11px; line-height: 1.5; color: var(--text-muted);
      text-align: center; margin: -2px 0 0; padding: 0 8px;
    }
    .sr-only {
      position: absolute !important; width: 1px !important; height: 1px !important;
      padding: 0 !important; margin: -1px !important; overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important;
    }

    .bottom-nav {
      display: flex; background: #FFFFFF; border-top: 1px solid var(--line);
      box-shadow: 0 -2px 14px rgba(15,35,60,0.08); flex-shrink: 0;
      padding-bottom: env(safe-area-inset-bottom);
    }
    .nav-tab {
      flex: 1; height: 64px; background: transparent; border: none; cursor: pointer;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
      position: relative; color: var(--text); font-family: var(--font-body);
    }
    .nav-tab.is-active { color: #1a3a52; }
    .nav-tab.is-active .nav-dot { background: var(--baby-blue-deep); }
    .nav-tab:disabled { opacity: 0.4; cursor: not-allowed; }
    .nav-dot { position: absolute; top: 6px; width: 6px; height: 6px; border-radius: 50%; background: transparent; }
    .nav-icon { width: 24px; height: 24px; }
    .nav-label { font-size: 0.7rem; font-weight: 500; line-height: 1; letter-spacing: 0.1px; }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
  `],
})
export class BeautyBookingSuccessComponent implements OnChanges, OnDestroy {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  copied = false;
  isCancelling = false;
  confirmOpen = false;
  graceSecondsLeft = 0;
  graceExpiredAnnouncement = '';
  private graceTimer: ReturnType<typeof setInterval> | null = null;
  private graceWasActive = false;
  private isBrowser = false;

  constructor(
    private authService: BeautyAuthService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnChanges(_: SimpleChanges): void {
    this.refreshGraceCountdown();
  }

  ngOnDestroy(): void {
    this.stopGraceTimer();
  }

  get booking(): SuccessBooking | null {
    return (this.data['booking'] as SuccessBooking) || null;
  }

  get graceCountdownLabel(): string {
    const total = Math.max(0, this.graceSecondsLeft);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  formatLocal(iso: string | undefined | null, tz?: string | null): string {
    return formatSlotLocal(iso, tz);
  }

  confirmationCode(id: number): string {
    const hex = id.toString(16).toUpperCase().padStart(8, '0');
    return `BK-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
  }

  copyCode(id: number): void {
    const code = this.confirmationCode(id);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.copied = true;
        setTimeout(() => (this.copied = false), 1600);
      }).catch(() => {});
    }
  }

  onShare(): void {
    const b = this.booking;
    if (!b || typeof navigator === 'undefined') return;
    const text = `Booked: ${b.service.name} at ${b.provider.name}`;
    if ((navigator as any).share) {
      (navigator as any).share({ title: 'Booking confirmed', text }).catch(() => {});
    }
  }

  addToCalendar(): void {
    const b = this.booking;
    if (!b || !this.isBrowser) return;
    const start = new Date(b.slot_at);
    const end = new Date(start.getTime() + (b.service.duration_minutes || 60) * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Beauty//EN', 'BEGIN:VEVENT',
      `UID:beauty-booking-${b.id}@beauty.local`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:${b.service.name} at ${b.provider.name}`,
      `LOCATION:${b.provider.location_label}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beauty-booking-${b.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  askGraceCancel(): void {
    if (this.isCancelling) return;
    this.confirmOpen = true;
  }

  runGraceCancel(): void {
    const link = this.links['cancel_grace'];
    if (!link || this.isCancelling) return;
    this.isCancelling = true;
    this.authService.follow(link).subscribe({
      next: () => {
        this.isCancelling = false;
        this.confirmOpen = false;
        const home = this.links['home'];
        if (home) this.followLink.emit(home);
      },
      error: () => {
        this.isCancelling = false;
        this.confirmOpen = false;
      },
    });
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  private refreshGraceCountdown(): void {
    this.stopGraceTimer();
    const ends = this.booking?.grace_period_ends_at;
    if (!ends || !this.isBrowser) {
      this.graceSecondsLeft = 0;
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(ends).getTime() - Date.now()) / 1000));
      const previouslyActive = this.graceWasActive;
      if (remaining > 0) this.graceWasActive = true;
      this.graceSecondsLeft = remaining;
      if (remaining <= 0 && previouslyActive) {
        this.graceExpiredAnnouncement = 'Grace period expired';
        this.graceWasActive = false;
      }
      if (remaining <= 0) this.stopGraceTimer();
    };
    tick();
    this.graceTimer = setInterval(tick, 1000);
  }

  private stopGraceTimer(): void {
    if (this.graceTimer != null) {
      clearInterval(this.graceTimer);
      this.graceTimer = null;
    }
  }
}
