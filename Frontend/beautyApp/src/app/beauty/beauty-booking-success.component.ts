/**
 * BeautyBookingSuccessComponent (Presentational)
 * ----------------------------------------------
 * Customer-web booking confirmation. Desktop layout per design
 * `WebCustomerConfirmed`: shared CustTopNav, a centred success header, a
 * details card (service + When / Paid / Reference), a free-cancel grace
 * banner with a live countdown (amber while in-window, grey once expired),
 * and an actions row (Add to calendar / Directions / Message studio / Done).
 * Collapses on mobile. RN app untouched.
 *
 * Behaviour preserved & BFF-driven: live grace countdown from
 * `grace_period_ends_at`, the `cancel_grace` POST (via confirm modal), the
 * `.ics` calendar export, and HATEOAS nav (`bookings`, `home`, `chat_thread`).
 *
 * NOTE: "Paid" shows the service price and pay method "Card" — the BFF returns
 * no tax/payment-instrument detail on this screen.
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
import { BeautyConfirmModalComponent } from './beauty-confirm-modal.component';
import { CustTopNavComponent } from './cust-web/cust-top-nav.component';
import { BeautyHomeSearchComponent } from './beauty-home-search.component';

interface SuccessBooking {
  id: number;
  status: string;
  slot_at: string;
  slot_label: string;
  grace_period_ends_at?: string | null;
  in_grace_window?: boolean;
  service: { id: number; name: string; price_cents: number; duration_minutes: number; };
  provider: { id: number; name: string; location_label: string; timezone?: string; };
}

@Component({
  selector: 'app-beauty-booking-success',
  standalone: true,
  imports: [CommonModule, BeautyConfirmModalComponent, CustTopNavComponent, BeautyHomeSearchComponent],
  template: `
    <div class="cust-confirm" *ngIf="booking as b">
      <app-cust-top-nav active="" [links]="links" [signedIn]="true" (follow)="emit($event)">
        <app-beauty-home-search topnav-search></app-beauty-home-search>
      </app-cust-top-nav>

      <main id="main" class="confirm-main">
        <div class="confirm-inner">
          <div class="head">
            <div class="check-disc" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2F7A47" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4L19 7"/></svg>
            </div>
            <div class="eyebrow">Booking confirmed</div>
            <h1 class="headline">{{ headline }}</h1>
            <p class="sub">We sent a receipt and calendar invite to your email.</p>
          </div>

          <div class="card">
            <div class="card-top">
              <span class="thumb" [style.--hue]="heroHue"></span>
              <div class="card-main">
                <div class="svc-name">{{ b.service.name }}</div>
                <div class="svc-at">at {{ b.provider.name }}<span *ngIf="b.provider.location_label"> · {{ b.provider.location_label }}</span></div>
                <div class="facts">
                  <div class="fact">
                    <div class="fact-k">When</div>
                    <div class="fact-v">{{ whenDate }}</div>
                    <div class="fact-mono">{{ whenTimeDur }}</div>
                  </div>
                  <div class="fact">
                    <div class="fact-k">Paid</div>
                    <div class="fact-v mono">{{ paidLabel }}</div>
                    <div class="fact-mono">Card</div>
                  </div>
                  <div class="fact">
                    <div class="fact-k">Reference</div>
                    <div class="fact-v mono">{{ confirmationCode(b.id) }}</div>
                    <button type="button" class="ref-copy" (click)="copyCode(b.id)">{{ copied ? 'Copied' : 'Copy' }}</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Grace / cancel banner -->
            <div class="grace grace--amber" *ngIf="links['cancel_grace'] && graceSecondsLeft > 0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A6A1F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/></svg>
              <div class="grace-text">Free cancellation for <span class="grace-count" aria-live="off">{{ graceCountdownLabel }}</span> · full refund, no questions asked.</div>
              <button type="button" class="btn btn--danger-outline btn--sm" (click)="askGraceCancel()" [disabled]="isCancelling">Cancel free</button>
              <span class="sr-only" aria-live="polite">{{ graceExpiredAnnouncement }}</span>
            </div>
            <div class="grace grace--grey" *ngIf="!(links['cancel_grace'] && graceSecondsLeft > 0)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/></svg>
              <div class="grace-text grace-text--grey">Free-cancel window closed. Manage or cancel this booking from My bookings.</div>
            </div>

            <!-- Actions -->
            <div class="actions">
              <button type="button" class="btn btn--secondary btn--md" (click)="addToCalendar()">Add to calendar</button>
              <a class="btn btn--secondary btn--md" [href]="directionsUrl" target="_blank" rel="noopener">Directions →</a>
              <button type="button" class="btn btn--secondary btn--md" (click)="emit(links['chat_thread'])" [disabled]="!links['chat_thread']">Message studio</button>
              <span class="actions-spacer"></span>
              <button type="button" class="btn btn--primary btn--md" (click)="emit(links['bookings'])" [disabled]="!links['bookings']">Done</button>
            </div>
          </div>
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
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF;
      --ink: #0A0A0B; --ink-soft: #1F1F22; --success: #2F7A47; --danger: #C0392B;
      --hue: #5C4A3F;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh; background: var(--surface);
      font-family: var(--font-body); color: var(--text);
    }
    * { box-sizing: border-box; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .sr-only { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0,0,0,0) !important; white-space: nowrap !important; border: 0 !important; }

    .cust-confirm { display: flex; flex-direction: column; min-height: 100dvh; }
    .confirm-main { flex: 1; padding: 48px 32px; }
    .confirm-inner { max-width: 720px; margin: 0 auto; }
    .mono { font-family: var(--font-mono); }

    .head { text-align: center; margin-bottom: 28px; }
    .check-disc { width: 72px; height: 72px; border-radius: 50%; background: #E5F3EA; display: grid; place-items: center; margin: 0 auto 18px; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--success); }
    .headline { margin: 10px 0 0; font-family: var(--font-display); font-size: 42px; font-weight: 500; line-height: 1.1; }
    .sub { font-size: 14px; color: var(--text-muted); margin-top: 8px; }

    .card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 28px; }
    .card-top { display: flex; gap: 18px; }
    .thumb { width: 88px; height: 88px; border-radius: 12px; flex-shrink: 0;
      background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--hue) 18%, transparent) 0, color-mix(in srgb, var(--hue) 18%, transparent) 8px, color-mix(in srgb, var(--hue) 28%, transparent) 8px, color-mix(in srgb, var(--hue) 28%, transparent) 16px), color-mix(in srgb, var(--hue) 42%, #fff); }
    .card-main { flex: 1; min-width: 0; }
    .svc-name { font-family: var(--font-display); font-size: 26px; font-weight: 500; }
    .svc-at { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
    .facts { margin-top: 14px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .fact-k { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); }
    .fact-v { font-size: 14px; font-weight: 600; margin-top: 2px; }
    .fact-mono { font-family: var(--font-mono); font-size: 12px; color: var(--text); margin-top: 2px; }
    .ref-copy { background: none; border: none; padding: 0; margin-top: 2px; font: inherit; font-size: 11px; font-weight: 600; color: #1a3a52; cursor: pointer; text-decoration: underline; }

    .grace { margin-top: 22px; padding: 14px; border-radius: 10px; display: flex; align-items: center; gap: 12px; }
    .grace--amber { background: #FFF4DA; border: 1px solid rgba(165,122,31,0.25); }
    .grace--grey { background: var(--surface); border: 1px solid var(--line); }
    .grace-text { flex: 1; font-size: 13px; color: #8A6A1F; }
    .grace-text--grey { color: var(--text-muted); }
    .grace-count { font-family: var(--font-mono); font-weight: 700; }

    .actions { margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .actions-spacer { flex: 1; }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 10px; font-family: var(--font-body); font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; transition: background 150ms ease, border-color 150ms ease; }
    .btn--md { height: 44px; padding: 0 18px; font-size: 14px; }
    .btn--sm { height: 36px; padding: 0 14px; font-size: 13px; }
    .btn--primary { background: var(--ink); color: #fff; border-color: var(--ink); }
    .btn--primary:hover:not(:disabled) { background: var(--ink-soft); border-color: var(--ink-soft); }
    .btn--secondary { background: #fff; color: var(--text); border-color: var(--line); }
    .btn--secondary:hover:not(:disabled) { border-color: var(--accent-blue-deep); }
    .btn--danger-outline { background: #fff; color: var(--danger); border-color: rgba(192,57,43,0.4); }
    .btn--danger-outline:hover:not(:disabled) { background: #FCE8E5; }
    .btn:disabled { opacity: .55; cursor: not-allowed; }

    @media (max-width: 720px) {
      .confirm-main { padding: 28px 20px; }
      .headline { font-size: 32px; }
      .card-top { flex-direction: column; }
      .facts { grid-template-columns: 1fr; gap: 12px; }
      .actions { flex-direction: column; align-items: stretch; }
      .actions-spacer { display: none; }
      .btn--md { width: 100%; }
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

  ngOnChanges(_: SimpleChanges): void { this.refreshGraceCountdown(); }
  ngOnDestroy(): void { this.stopGraceTimer(); }

  get booking(): SuccessBooking | null {
    return (this.data['booking'] as SuccessBooking) || null;
  }

  get heroHue(): string { return '#5C4A3F'; }

  get headline(): string {
    const dow = this.formatPart({ weekday: 'long' });
    return dow ? `See you ${dow}!` : 'You’re all set!';
  }
  get whenDate(): string {
    return this.formatPart({ weekday: 'short', month: 'short', day: 'numeric' }) || (this.booking?.slot_label ?? '');
  }
  get whenTimeDur(): string {
    const t = this.formatPart({ hour: 'numeric', minute: '2-digit' });
    const dur = this.booking?.service.duration_minutes;
    return [t, dur ? `${dur} min` : ''].filter(Boolean).join(' · ');
  }
  get paidLabel(): string {
    const c = this.booking?.service.price_cents ?? 0;
    return `$${(c / 100).toFixed(2)}`;
  }
  get directionsUrl(): string {
    const q = encodeURIComponent(this.booking?.provider.location_label || this.booking?.provider.name || '');
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }
  get graceCountdownLabel(): string {
    const total = Math.max(0, this.graceSecondsLeft);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  private formatPart(opts: Intl.DateTimeFormatOptions): string {
    const iso = this.booking?.slot_at;
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const tz = this.booking?.provider.timezone;
    const o: Intl.DateTimeFormatOptions = { ...opts };
    if (tz) o.timeZone = tz;
    try { return new Intl.DateTimeFormat(undefined, o).format(d); }
    catch { return new Intl.DateTimeFormat(undefined, opts).format(d); }
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

  addToCalendar(): void {
    const b = this.booking;
    if (!b || !this.isBrowser) return;
    const start = new Date(b.slot_at);
    const end = new Date(start.getTime() + (b.service.duration_minutes || 60) * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Beauty//EN', 'BEGIN:VEVENT',
      `UID:beauty-booking-${b.id}@beauty.local`,
      `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:${b.service.name} at ${b.provider.name}`,
      `LOCATION:${b.provider.location_label}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `beauty-booking-${b.id}.ics`; a.click();
    URL.revokeObjectURL(url);
  }

  askGraceCancel(): void { if (!this.isCancelling) this.confirmOpen = true; }

  runGraceCancel(): void {
    const link = this.links['cancel_grace'];
    if (!link || this.isCancelling) return;
    this.isCancelling = true;
    this.authService.follow(link).subscribe({
      next: () => {
        this.isCancelling = false; this.confirmOpen = false;
        const home = this.links['home'];
        if (home) this.followLink.emit(home);
      },
      error: () => { this.isCancelling = false; this.confirmOpen = false; },
    });
  }

  emit(link: BffLink | null | undefined): void { if (link) this.followLink.emit(link); }

  private refreshGraceCountdown(): void {
    this.stopGraceTimer();
    const ends = this.booking?.grace_period_ends_at;
    if (!ends || !this.isBrowser) { this.graceSecondsLeft = 0; return; }
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
    if (this.graceTimer != null) { clearInterval(this.graceTimer); this.graceTimer = null; }
  }
}
