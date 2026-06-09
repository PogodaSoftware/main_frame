/**
 * BeautyBookingDetailComponent (Presentational)
 * ---------------------------------------------
 * Customer-web booking status / manage screen. Desktop layout per design
 * `WebBookingStatus`: shared CustTopNav, breadcrumb, status pill + title +
 * total, then a two-column body — left: an at-a-glance card (When / Duration /
 * Stylist / Service) + a Where card + a cancellation-policy card; right: a
 * sticky Manage panel (reschedule, grace-aware cancel, provider contact).
 * Collapses on mobile. RN app untouched.
 *
 * Behaviour preserved & BFF-driven (single component, no layout fork):
 *   - `reschedule` (upcoming) — non-destructive nav.
 *   - `cancel` (post-grace) — destructive, confirm modal.
 *   - `cancel_grace` (within 5-min grace) — free cancel, confirm modal, with a
 *     live countdown from `grace_period_ends_at`; flips to the $20 cancel once
 *     the BFF stops returning the grace link.
 *   - cancelled_* statuses render a labelled banner and hide manage actions.
 * Grace state is mirrored into the NgRx store (cache; BFF stays source-of-truth).
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

import { Store } from '@ngrx/store';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { formatSlotLocal } from './beauty-time.util';
import { BeautyConfirmModalComponent } from './beauty-confirm-modal.component';
import * as BookingActions from './store/booking.actions';
import { CustTopNavComponent } from './cust-web/cust-top-nav.component';
import { BeautyHomeSearchComponent } from './beauty-home-search.component';

interface BookingDetail {
  id: number;
  status: string;
  is_upcoming: boolean;
  slot_at: string;
  slot_label: string;
  service: { id: number; name: string; description: string; price_cents: number; duration_minutes: number; category: string; };
  provider: { id: number; name: string; short_description: string; location_label: string; timezone?: string; };
  grace_period_ends_at?: string | null;
  in_grace_window?: boolean;
}

type ConfirmKind = 'cancel' | 'cancel_grace';

@Component({
  selector: 'app-beauty-booking-detail',
  standalone: true,
  imports: [CommonModule, BeautyConfirmModalComponent, CustTopNavComponent, BeautyHomeSearchComponent],
  template: `
    <div class="cust-status" *ngIf="booking as b" [style.--hue]="heroHue">
      <app-cust-top-nav active="" [links]="links" [signedIn]="true" (follow)="emit($event)">
        <app-beauty-home-search topnav-search></app-beauty-home-search>
      </app-cust-top-nav>

      <main id="main" class="status-main">
        <div class="status-inner">
          <!-- Breadcrumb -->
          <div class="crumb">
            <button type="button" class="crumb-link" (click)="emit(links['bookings'])" [disabled]="!links['bookings']">My bookings</button>
            <span class="crumb-sep">›</span>
            <span class="crumb-current">{{ b.service.name }} · {{ shortWhen }}</span>
          </div>

          <!-- Title row -->
          <div class="title-row">
            <div>
              <span class="pill" [class]="'pill--' + statusTone">
                <span class="pill-dot"></span>{{ statusLabel }}
              </span>
              <h1 class="title">{{ b.service.name }}</h1>
              <div class="at">at <strong>{{ b.provider.name }}</strong><span *ngIf="b.provider.location_label"> · {{ b.provider.location_label }}</span></div>
            </div>
            <div class="total">
              <div class="total-k">Total</div>
              <div class="total-v">\${{ (b.service.price_cents / 100).toFixed(2) }}</div>
            </div>
          </div>

          <div class="grid">
            <!-- LEFT -->
            <div class="col-main">
              <!-- At-a-glance -->
              <div class="card pad0 glance">
                <div class="glance-hero">
                  <div class="conf">
                    <div class="conf-k">Confirmation</div>
                    <div class="conf-v">{{ confirmationCode(b.id) }}</div>
                  </div>
                </div>
                <div class="glance-grid">
                  <div class="fact"><div class="fact-k">When</div><div class="fact-v">{{ whenDate }}</div><div class="fact-mono">{{ whenTime }}</div></div>
                  <div class="fact"><div class="fact-k">Duration</div><div class="fact-v">{{ b.service.duration_minutes }} min</div><div class="fact-mono">ends {{ endsTime }}</div></div>
                  <div class="fact"><div class="fact-k">Studio</div><div class="fact-v">{{ b.provider.name }}</div><div class="fact-mono" *ngIf="b.provider.short_description">{{ b.provider.short_description }}</div></div>
                  <div class="fact"><div class="fact-k">Service</div><div class="fact-v">{{ b.service.name }}</div><div class="fact-mono">1 × \${{ (b.service.price_cents / 100).toFixed(2) }}</div></div>
                </div>
              </div>

              <!-- Where -->
              <div class="card pad0 where">
                <div class="where-map"><span class="where-pin"></span></div>
                <div class="where-body">
                  <div class="fact-k">Where</div>
                  <div class="where-name">{{ b.provider.name }}</div>
                  <div class="where-addr" *ngIf="b.provider.location_label">{{ b.provider.location_label }}</div>
                  <div class="where-actions">
                    <a class="btn btn--secondary btn--sm" [href]="directionsUrl" target="_blank" rel="noopener">Get directions</a>
                    <button type="button" class="btn btn--ghost btn--sm" (click)="copyAddress()">{{ copiedAddr ? 'Copied' : 'Copy address' }}</button>
                  </div>
                </div>
              </div>

              <!-- Policy -->
              <div class="card policy">
                <div class="fact-k">Cancellation policy</div>
                <ul class="policy-list">
                  <li><span class="policy-when">0–5 min</span><span>Free to cancel — full refund.</span></li>
                  <li><span class="policy-when">&gt; 24h</span><span>Reschedule free. Cancel for a <span class="mono">$20</span> fee.</span></li>
                  <li><span class="policy-when">&lt; 24h</span><span>Same-day cancel forfeits the booking.</span></li>
                </ul>
              </div>
            </div>

            <!-- RIGHT sticky -->
            <div class="col-side">
              <!-- Cancelled banners -->
              <div class="card banner banner--danger" *ngIf="b.status === 'cancelled_by_business'">
                <strong>Provider cancelled this booking.</strong> Refund processed.
                <button *ngIf="links['request_refund']" type="button" class="banner-link" (click)="emit(links['request_refund'])">Request refund help</button>
              </div>
              <div class="card banner banner--neutral" *ngIf="b.status === 'cancelled_by_customer' || b.status === 'cancelled'">You cancelled this booking.</div>
              <div class="card banner banner--info" *ngIf="b.status === 'cancelled_immediate'">Booked then cancelled within the grace window. No charge.</div>

              <!-- Manage panel (active bookings) -->
              <div class="card manage" *ngIf="!isCancelled(b.status)">
                <div class="fact-k">Manage booking</div>
                <div class="manage-when">{{ inDaysLabel }}</div>
                <div class="manage-sub">Free reschedule up to 4 hours before.</div>

                <div class="manage-actions">
                  <button *ngIf="links['reschedule']" type="button" class="btn btn--primary btn--lg btn--full" (click)="emit(links['reschedule'])">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
                    {{ links['reschedule'].prompt || 'Reschedule' }}
                  </button>
                  <div class="manage-two">
                    <button type="button" class="btn btn--secondary btn--md" (click)="emit(links['provider'])" [disabled]="!links['provider']">View provider</button>
                    <button type="button" class="btn btn--secondary btn--md" (click)="addToCalendar()">Add to calendar</button>
                  </div>

                  <!-- grace vs after-grace cancel -->
                  <div class="grace-banner" *ngIf="links['cancel_grace'] && graceSecondsLeft > 0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a3a52" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                    <div class="grace-text">Free cancel for <span class="grace-count">{{ graceCountdownLabel }}</span></div>
                    <button type="button" class="btn btn--danger-outline btn--sm" (click)="askConfirm('cancel_grace')" [disabled]="isCancelling">Cancel free</button>
                    <span class="sr-only" aria-live="polite">{{ graceExpiredAnnouncement }}</span>
                  </div>
                  <button
                    *ngIf="links['cancel'] && !(links['cancel_grace'] && graceSecondsLeft > 0)"
                    type="button" class="btn btn--danger-outline btn--md btn--full"
                    (click)="askConfirm('cancel')" [disabled]="isCancelling"
                  >{{ isCancelling ? 'Cancelling…' : 'Cancel this booking · $20 fee' }}</button>
                </div>

                <p *ngIf="cancelError" class="server-error" role="alert" aria-live="assertive">{{ cancelError }}</p>
              </div>

              <!-- Cancelled → re-book -->
              <div class="card" *ngIf="isCancelled(b.status) && links['provider']">
                <button type="button" class="btn btn--primary btn--md btn--full" (click)="emit(links['provider'])">Book again</button>
              </div>

              <!-- Provider contact -->
              <div class="card contact" *ngIf="links['chat_thread']">
                <span class="contact-avatar">{{ providerInitial }}</span>
                <div class="contact-info">
                  <div class="contact-name">{{ b.provider.name }}</div>
                  <div class="contact-sub">Usually replies within an hour</div>
                </div>
                <button type="button" class="btn btn--secondary btn--sm" (click)="emit(links['chat_thread'])">Message</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <app-beauty-confirm-modal
        *ngIf="confirmKind"
        [open]="!!confirmKind"
        [title]="confirmTitle"
        [body]="confirmBody"
        [primaryLabel]="confirmPrimary"
        [primaryVariant]="'danger'"
        [secondaryLabel]="'Keep booking'"
        [busy]="isCancelling"
        [busyLabel]="'Cancelling…'"
        (confirmed)="runConfirmed()"
        (dismissed)="confirmKind = null"
      />
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --ink: #0A0A0B; --ink-soft: #1F1F22; --success: #2F7A47; --danger: #C0392B; --hue: #5C4A3F;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh; background: var(--surface);
      font-family: var(--font-body); color: var(--text);
    }
    * { box-sizing: border-box; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .sr-only { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0,0,0,0) !important; white-space: nowrap !important; border: 0 !important; }
    .mono { font-family: var(--font-mono); }

    .cust-status { display: flex; flex-direction: column; min-height: 100dvh; }
    .status-main { flex: 1; padding: 32px 32px 48px; }
    .status-inner { max-width: 1180px; margin: 0 auto; }

    .crumb { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); margin-bottom: 14px; }
    .crumb-link { background: none; border: none; padding: 0; color: var(--text-muted); cursor: pointer; font: inherit; }
    .crumb-link:hover:not(:disabled) { color: var(--text); text-decoration: underline; }
    .crumb-current { color: var(--text); }

    .title-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
    .pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; margin-bottom: 10px; }
    .pill-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .pill--ok { background: #E5F3EA; color: var(--success); }
    .pill--cancel { background: #FCE8E5; color: var(--danger); }
    .pill--neutral { background: var(--surface-2); color: var(--text-muted); }
    .title { font-family: var(--font-display); font-size: 42px; font-weight: 500; line-height: 1.05; }
    .at { margin-top: 6px; font-size: 14px; color: var(--text-muted); }
    .total { text-align: right; flex-shrink: 0; }
    .total-k { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); }
    .total-v { font-family: var(--font-display); font-size: 32px; font-weight: 500; line-height: 1; margin-top: 2px; }

    .grid { display: grid; grid-template-columns: 1fr 360px; gap: 24px; align-items: flex-start; }
    .col-main { display: flex; flex-direction: column; gap: 16px; }
    .col-side { position: sticky; top: 88px; display: flex; flex-direction: column; gap: 12px; }

    .card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 20px; }
    .card.pad0 { padding: 0; overflow: hidden; }
    .fact-k { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); }
    .fact-v { font-size: 14px; font-weight: 600; margin-top: 4px; }
    .fact-mono { font-family: var(--font-mono); font-size: 12px; color: var(--text); margin-top: 2px; }

    .glance-hero { height: 200px; position: relative;
      background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--hue) 22%, transparent) 0, color-mix(in srgb, var(--hue) 22%, transparent) 10px, color-mix(in srgb, var(--hue) 34%, transparent) 10px, color-mix(in srgb, var(--hue) 34%, transparent) 20px), color-mix(in srgb, var(--hue) 48%, #fff); }
    .conf { position: absolute; left: 18px; bottom: 18px; color: #fff; }
    .conf-k { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.2px; opacity: .7; text-transform: uppercase; }
    .conf-v { font-family: var(--font-mono); font-size: 16px; font-weight: 600; margin-top: 2px; text-shadow: 0 1px 4px rgba(0,0,0,0.3); }
    .glance-grid { padding: 22px 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }

    .where { display: flex; }
    .where-map { width: 200px; flex-shrink: 0; background: var(--surface-2); position: relative; min-height: 150px; }
    .where-pin { position: absolute; top: 40%; left: 34%; width: 10px; height: 10px; border-radius: 50%; background: var(--accent-blue-deep); box-shadow: 0 0 0 5px var(--accent-blue); }
    .where-body { flex: 1; padding: 20px 24px; display: flex; flex-direction: column; justify-content: center; }
    .where-name { font-family: var(--font-display); font-size: 22px; font-weight: 500; margin-top: 4px; }
    .where-addr { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
    .where-actions { margin-top: 12px; display: flex; gap: 8px; }

    .policy-list { margin: 10px 0 0; padding: 0; list-style: none; font-size: 13px; line-height: 1.7; }
    .policy-list li { display: flex; gap: 10px; }
    .policy-when { font-family: var(--font-mono); color: var(--text-muted); font-size: 11px; padding-top: 3px; min-width: 64px; }

    .banner { font-size: 13px; line-height: 1.5; border-left: 4px solid var(--line); }
    .banner--danger { border-left-color: var(--danger); background: #FCE8E5; color: #6F1D14; }
    .banner--neutral { border-left-color: #9A9AA0; background: var(--surface-2); }
    .banner--info { border-left-color: var(--accent-blue-deep); background: var(--accent-blue); color: var(--accent-blue-text); }
    .banner-link { display: block; margin-top: 6px; background: none; border: none; padding: 0; color: inherit; font: inherit; font-weight: 600; text-decoration: underline; cursor: pointer; }

    .manage-when { font-family: var(--font-display); font-size: 22px; font-weight: 500; margin-top: 4px; line-height: 1.2; }
    .manage-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .manage-actions { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
    .manage-two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

    .grace-banner { margin-top: 4px; padding: 10px 12px; border-radius: 10px; background: var(--accent-blue); border: 1px solid rgba(125,168,207,0.33); display: flex; align-items: center; gap: 10px; }
    .grace-text { flex: 1; font-size: 12px; color: var(--accent-blue-text); }
    .grace-count { font-family: var(--font-mono); font-weight: 700; }

    .contact { display: flex; align-items: center; gap: 12px; }
    .contact-avatar { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(135deg, #FCE2C2, #F5C36B); display: grid; place-items: center; font-size: 14px; font-weight: 700; color: #5a3d12; }
    .contact-info { flex: 1; min-width: 0; }
    .contact-name { font-size: 13px; font-weight: 600; }
    .contact-sub { font-size: 11px; color: var(--text-muted); }

    .server-error { margin-top: 10px; background: #FCE8E5; border: 1px solid #F4B5AE; border-radius: 10px; padding: 10px 14px; color: #8A2419; font-size: 13px; }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 10px; font-family: var(--font-body); font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; transition: background 150ms ease, border-color 150ms ease; }
    .btn--lg { height: 48px; padding: 0 20px; font-size: 15px; }
    .btn--md { height: 44px; padding: 0 16px; font-size: 14px; }
    .btn--sm { height: 36px; padding: 0 14px; font-size: 13px; }
    .btn--full { width: 100%; }
    .btn--primary { background: var(--ink); color: #fff; border-color: var(--ink); }
    .btn--primary:hover:not(:disabled) { background: var(--ink-soft); border-color: var(--ink-soft); }
    .btn--secondary { background: #fff; color: var(--text); border-color: var(--line); }
    .btn--secondary:hover:not(:disabled) { border-color: var(--accent-blue-deep); }
    .btn--ghost { background: transparent; color: var(--text); border-color: transparent; }
    .btn--ghost:hover { background: rgba(15,17,21,0.06); }
    .btn--danger-outline { background: #fff; color: var(--danger); border-color: rgba(192,57,43,0.4); }
    .btn--danger-outline:hover:not(:disabled) { background: #FCE8E5; }
    .btn:disabled { opacity: .55; cursor: not-allowed; }

    @media (max-width: 980px) {
      .grid { grid-template-columns: 1fr; }
      .col-side { position: static; }
      .status-main { padding: 20px; }
      .title { font-size: 32px; }
      .glance-grid { grid-template-columns: repeat(2, 1fr); }
      .where { flex-direction: column; }
      .where-map { width: 100%; min-height: 120px; }
    }
  `],
})
export class BeautyBookingDetailComponent implements OnChanges, OnDestroy {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  isCancelling = false;
  cancelError = '';
  copiedAddr = false;
  confirmKind: ConfirmKind | null = null;

  graceSecondsLeft = 0;
  graceExpiredAnnouncement = '';
  private graceTimer: ReturnType<typeof setInterval> | null = null;
  private graceWasActive = false;
  private isBrowser = false;

  constructor(
    private authService: BeautyAuthService,
    private store: Store,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnChanges(_: SimpleChanges): void {
    this.refreshGraceCountdown();
    const b = this.booking;
    if (b && b.in_grace_window && this.links['cancel_grace'] && b.grace_period_ends_at) {
      this.store.dispatch(BookingActions.enterGracePeriod({
        bookingId: b.id,
        cancelLink: this.links['cancel_grace'],
        gracePeriodEndsAt: b.grace_period_ends_at,
      }));
    } else if (b) {
      this.store.dispatch(BookingActions.clearGracePeriod());
    }
  }

  ngOnDestroy(): void { this.stopGraceTimer(); }

  get booking(): BookingDetail | null { return (this.data['booking'] as BookingDetail) || null; }

  get heroHue(): string {
    const HUE: Record<string, string> = { hair: '#5C4A3F', nails: '#A88A7A', brows: '#5F5A4A', lashes: '#574A3D', facial: '#7A8B6E', facials: '#7A8B6E', massage: '#3A3A3A', wax: '#A06B2C', makeup: '#5C4A8A', skin: '#7A8B6E' };
    const c = (this.booking?.service.category || '').toLowerCase();
    return HUE[c] || '#5C4A3F';
  }

  isCancelled(status: string): boolean {
    return status === 'cancelled' || status === 'cancelled_by_customer'
      || status === 'cancelled_by_business' || status === 'cancelled_immediate';
  }

  get statusLabel(): string {
    const s = this.booking?.status || '';
    if (this.isCancelled(s)) return 'Cancelled';
    if (s === 'completed') return 'Completed';
    return 'Booked';
  }
  get statusTone(): 'ok' | 'cancel' | 'neutral' {
    const s = this.booking?.status || '';
    if (s === 'cancelled_by_business') return 'cancel';
    if (this.isCancelled(s)) return 'neutral';
    if (s === 'completed') return 'neutral';
    return 'ok';
  }

  get shortWhen(): string {
    return this.formatPart({ weekday: 'short', month: 'short', day: 'numeric' });
  }
  get whenDate(): string {
    return this.formatPart({ weekday: 'short', month: 'short', day: 'numeric' }) || (this.booking?.slot_label ?? '');
  }
  get whenTime(): string { return this.formatPart({ hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); }
  get endsTime(): string {
    const b = this.booking;
    if (!b) return '';
    const end = new Date(new Date(b.slot_at).getTime() + (b.service.duration_minutes || 0) * 60000);
    return this.formatDate(end, { hour: 'numeric', minute: '2-digit' });
  }
  get inDaysLabel(): string {
    const b = this.booking;
    if (!b) return '';
    const ms = new Date(b.slot_at).getTime() - Date.now();
    if (ms <= 0) return 'In progress / past';
    const days = Math.floor(ms / 86400000);
    if (days >= 1) return `In ${days} day${days === 1 ? '' : 's'}`;
    const hours = Math.floor(ms / 3600000);
    if (hours >= 1) return `In ${hours} hour${hours === 1 ? '' : 's'}`;
    return 'Soon';
  }
  get providerInitial(): string { return (this.booking?.provider.name.trim().charAt(0) || '?').toUpperCase(); }
  get directionsUrl(): string {
    const q = encodeURIComponent(this.booking?.provider.location_label || this.booking?.provider.name || '');
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  confirmationCode(id: number): string {
    const hex = id.toString(16).toUpperCase().padStart(8, '0');
    return `BK-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
  }

  copyAddress(): void {
    const addr = this.booking?.provider.location_label || '';
    if (!addr || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(addr).then(() => {
      this.copiedAddr = true;
      setTimeout(() => (this.copiedAddr = false), 1600);
    }).catch(() => {});
  }

  addToCalendar(): void {
    const b = this.booking;
    if (!b || !this.isBrowser) return;
    const start = new Date(b.slot_at);
    const end = new Date(start.getTime() + (b.service.duration_minutes || 60) * 60000);
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

  // ── Confirm modal copy ─────────────────────────
  get confirmTitle(): string { return this.confirmKind === 'cancel_grace' ? 'Cancel without charge?' : 'Cancel this booking?'; }
  get confirmBody(): string {
    return this.confirmKind === 'cancel_grace'
      ? "You're still inside the 5-minute grace window — we won't charge you."
      : 'You may be charged a late-cancel fee depending on the provider policy.';
  }
  get confirmPrimary(): string { return this.confirmKind === 'cancel_grace' ? 'Yes, cancel now' : 'Yes, cancel'; }

  askConfirm(kind: ConfirmKind): void { if (!this.isCancelling) this.confirmKind = kind; }

  runConfirmed(): void {
    if (!this.confirmKind || this.isCancelling) return;
    this.runCancelLink(this.confirmKind);
  }

  private runCancelLink(rel: 'cancel' | 'cancel_grace'): void {
    const link = this.links[rel];
    if (!link) { this.confirmKind = null; return; }
    this.isCancelling = true;
    this.cancelError = '';
    this.authService.follow(link).subscribe({
      next: () => {
        this.isCancelling = false; this.confirmKind = null;
        const self = this.links['self'];
        if (self) this.followLink.emit(self);
      },
      error: () => {
        this.isCancelling = false; this.confirmKind = null;
        this.cancelError = 'Could not cancel that booking. Please try again.';
      },
    });
  }

  emit(link: BffLink | null | undefined): void { if (link) this.followLink.emit(link); }

  formatLocal(iso: string | undefined | null, tz?: string | null): string { return formatSlotLocal(iso, tz); }

  private formatPart(opts: Intl.DateTimeFormatOptions): string {
    const iso = this.booking?.slot_at;
    if (!iso) return '';
    const d = new Date(iso);
    return this.formatDate(d, opts);
  }
  private formatDate(d: Date, opts: Intl.DateTimeFormatOptions): string {
    if (isNaN(d.getTime())) return '';
    const tz = this.booking?.provider.timezone;
    const o: Intl.DateTimeFormatOptions = { ...opts };
    if (tz) o.timeZone = tz;
    try { return new Intl.DateTimeFormat(undefined, o).format(d); }
    catch { return new Intl.DateTimeFormat(undefined, opts).format(d); }
  }

  // ── Grace countdown ─────────────────────────
  get graceCountdownLabel(): string {
    const total = Math.max(0, this.graceSecondsLeft);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

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
