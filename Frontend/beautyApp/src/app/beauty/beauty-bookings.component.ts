/**
 * BeautyBookingsComponent (Presentational)
 * ----------------------------------------
 * Customer-web "My bookings". Desktop layout per design
 * `WebCustomerBookingsList`: shared CustTopNav, title + count summary,
 * Upcoming / Past / All filter chips, then booking cards — upcoming rows carry
 * Reschedule / Cancel (grace-aware, live countdown) / Open, past rows carry a
 * status chip and Book-again. Collapses on mobile. RN app untouched.
 *
 * Behaviour preserved & BFF-driven: cancel + grace-cancel POST links from each
 * row, re-emitting `self` after a successful cancel so the shell re-resolves.
 *
 * NOTE: the bookings resolver does not emit per-row `reschedule` / re-book
 * links, so those are synthesised as NAV links to the existing routes
 * (`/bookings/:id/reschedule`, `/providers/:id`).
 */

import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { formatSlotLocal } from './beauty-time.util';
import { CustTopNavComponent } from './cust-web/cust-top-nav.component';
import { BeautyHomeSearchComponent } from './beauty-home-search.component';

interface BookingItem {
  id: number;
  status: string;
  slot_at: string;
  slot_label: string;
  grace_period_ends_at?: string | null;
  in_grace_window?: boolean;
  service: { id: number; name: string; price_cents: number; duration_minutes: number };
  provider: { id: number; name: string; location_label: string; timezone?: string };
  _links?: Record<string, BffLink>;
}

const HUES = ['#5C4A3F', '#A88A7A', '#5F5A4A', '#574A3D', '#7A8B6E', '#3A3A3A', '#A06B2C', '#5C4A8A'];

@Component({
  selector: 'app-beauty-bookings',
  standalone: true,
  imports: [CommonModule, CustTopNavComponent, BeautyHomeSearchComponent],
  template: `
    <div class="cust-bookings">
      <app-cust-top-nav active="bookings" [links]="links" [signedIn]="true" (follow)="emit($event)">
        <app-beauty-home-search topnav-search></app-beauty-home-search>
      </app-cust-top-nav>

      <main id="main" class="bk-main">
        <div class="bk-inner">
          <h1 class="title">My bookings</h1>
          <div class="subtitle">{{ upcoming.length }} upcoming · {{ past.length }} past</div>

          <div class="chips">
            <button type="button" class="chip" [class.is-active]="activeTab==='upcoming'" (click)="activeTab='upcoming'">Upcoming <span class="chip-c">{{ upcoming.length }}</span></button>
            <button type="button" class="chip" [class.is-active]="activeTab==='past'" (click)="activeTab='past'">Past <span class="chip-c">{{ past.length }}</span></button>
            <button type="button" class="chip" [class.is-active]="activeTab==='all'" (click)="activeTab='all'">All <span class="chip-c">{{ upcoming.length + past.length }}</span></button>
          </div>

          <!-- Upcoming -->
          <ng-container *ngIf="activeTab !== 'past'">
            <div class="list" *ngIf="upcoming.length; else noUp">
              <article class="card row" *ngFor="let b of upcoming">
                <span class="thumb" [style.--hue]="hueFor(b)"></span>
                <div class="row-main">
                  <div class="row-name">{{ b.service.name }}</div>
                  <div class="row-at">at {{ b.provider.name }}</div>
                  <div class="row-meta">
                    <span class="mono">{{ dateTime(b) }}</span>
                    <span class="mono">{{ b.service.duration_minutes }} min</span>
                    <span class="mono">\${{ (b.service.price_cents / 100).toFixed(2) }}</span>
                  </div>
                </div>
                <span class="chip-status chip-status--ok">Booked</span>
                <div class="row-actions">
                  <button *ngIf="b._links?.['reschedule']" type="button" class="btn btn--secondary btn--sm" (click)="emit(b._links!['reschedule'])">Reschedule</button>
                  <button
                    *ngIf="b._links?.['cancel_grace'] && graceRemaining(b) > 0; else plainCancel"
                    type="button" class="btn btn--danger-outline btn--sm"
                    (click)="cancelGrace(b)" [disabled]="busyId === b.id"
                  >Cancel free · {{ graceLabel(b) }}</button>
                  <ng-template #plainCancel>
                    <button *ngIf="b._links?.['cancel']" type="button" class="btn btn--danger-outline btn--sm" (click)="cancel(b)" [disabled]="busyId === b.id">{{ busyId === b.id ? '…' : 'Cancel' }}</button>
                  </ng-template>
                  <button type="button" class="btn btn--ghost btn--sm" (click)="openDetails(b)">Open →</button>
                </div>
              </article>
            </div>
            <ng-template #noUp>
              <div class="empty-card" *ngIf="activeTab==='upcoming'">
                <div class="empty-title">No upcoming bookings</div>
                <button type="button" class="btn btn--primary btn--md" (click)="emit(links['home'])">Discover studios</button>
              </div>
            </ng-template>
          </ng-container>

          <!-- Past -->
          <ng-container *ngIf="activeTab !== 'upcoming'">
            <h2 class="section-h" *ngIf="activeTab==='all' && past.length">Past</h2>
            <div class="list" *ngIf="past.length; else noPast">
              <article class="card row row--past" *ngFor="let b of past">
                <span class="thumb thumb--sm" [style.--hue]="hueFor(b)"></span>
                <div class="row-main">
                  <div class="row-name row-name--sm">{{ b.service.name }}</div>
                  <div class="row-at">at {{ b.provider.name }} · <span class="mono">{{ shortDate(b) }}</span></div>
                </div>
                <span class="chip-status" [class.chip-status--cancel]="b.status==='cancelled_by_business'" [class.chip-status--neutral]="isCancelled(b.status) || b.status==='completed'">{{ statusLabel(b.status) }}</span>
                <div class="row-actions">
                  <button *ngIf="b._links?.['provider']" type="button" class="btn btn--secondary btn--sm" (click)="emit(b._links!['provider'])">Book again</button>
                  <button type="button" class="btn btn--ghost btn--sm" (click)="openDetails(b)">Open →</button>
                </div>
              </article>
            </div>
            <ng-template #noPast>
              <div class="empty-card" *ngIf="activeTab==='past'"><div class="empty-title">No past bookings yet</div></div>
            </ng-template>
          </ng-container>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --ink: #0A0A0B; --ink-soft: #1F1F22; --success: #2F7A47; --danger: #C0392B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh; background: var(--surface);
      font-family: var(--font-body); color: var(--text);
    }
    * { box-sizing: border-box; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .cust-bookings { display: flex; flex-direction: column; min-height: 100dvh; }
    .bk-main { flex: 1; padding: 32px 32px 48px; }
    .bk-inner { max-width: 1280px; margin: 0 auto; }
    .mono { font-family: var(--font-mono); font-size: 12px; color: var(--text); }

    .title { font-family: var(--font-display); font-size: 42px; font-weight: 500; }
    .subtitle { margin-top: 6px; font-size: 14px; color: var(--text-muted); }

    .chips { display: flex; gap: 6px; margin-top: 22px; }
    .chip { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line); background: #fff; font-size: 13px; font-weight: 600; color: var(--text); cursor: pointer; }
    .chip:hover:not(.is-active) { border-color: var(--accent-blue-deep); }
    .chip.is-active { background: var(--ink); color: #fff; border-color: var(--ink); }
    .chip-c { font-family: var(--font-mono); font-size: 11px; opacity: .7; }

    .section-h { margin: 32px 0 14px; font-family: var(--font-display); font-size: 26px; font-weight: 500; }
    .list { margin-top: 18px; display: flex; flex-direction: column; gap: 12px; }

    .card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 20px; }
    .row { display: flex; gap: 16px; align-items: center; }
    .row--past { opacity: .9; }
    .thumb { width: 64px; height: 64px; border-radius: 12px; flex-shrink: 0;
      background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--hue) 16%, transparent) 0, color-mix(in srgb, var(--hue) 16%, transparent) 8px, color-mix(in srgb, var(--hue) 24%, transparent) 8px, color-mix(in srgb, var(--hue) 24%, transparent) 16px), color-mix(in srgb, var(--hue) 36%, #fff); }
    .thumb--sm { width: 56px; height: 56px; }
    .row-main { flex: 1; min-width: 0; }
    .row-name { font-family: var(--font-display); font-size: 22px; font-weight: 500; }
    .row-name--sm { font-size: 20px; }
    .row-at { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
    .row-meta { margin-top: 8px; display: flex; gap: 14px; flex-wrap: wrap; }
    .row-actions { display: flex; gap: 6px; flex-shrink: 0; }

    .chip-status { flex-shrink: 0; padding: 5px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: .4px; background: #E5F3EA; color: var(--success); }
    .chip-status--ok { background: #E5F3EA; color: var(--success); }
    .chip-status--neutral { background: var(--surface-2); color: var(--text-muted); }
    .chip-status--cancel { background: #FCE8E5; color: var(--danger); }

    .empty-card { margin-top: 18px; background: #fff; border: 1px dashed var(--line); border-radius: 16px; padding: 40px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
    .empty-title { font-family: var(--font-display); font-size: 22px; font-weight: 500; color: var(--text-muted); }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 10px; font-family: var(--font-body); font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: background 150ms ease, border-color 150ms ease; }
    .btn--sm { height: 36px; padding: 0 14px; font-size: 13px; }
    .btn--md { height: 44px; padding: 0 18px; font-size: 14px; }
    .btn--primary { background: var(--ink); color: #fff; border-color: var(--ink); }
    .btn--primary:hover { background: var(--ink-soft); border-color: var(--ink-soft); }
    .btn--secondary { background: #fff; color: var(--text); border-color: var(--line); }
    .btn--secondary:hover:not(:disabled) { border-color: var(--accent-blue-deep); }
    .btn--ghost { background: transparent; color: var(--text); border-color: transparent; }
    .btn--ghost:hover { background: rgba(15,17,21,0.06); }
    .btn--danger-outline { background: #fff; color: var(--danger); border-color: rgba(192,57,43,0.4); }
    .btn--danger-outline:hover:not(:disabled) { background: #FCE8E5; }
    .btn:disabled { opacity: .55; cursor: not-allowed; }

    @media (max-width: 760px) {
      .bk-main { padding: 20px; }
      .title { font-size: 32px; }
      .row { flex-wrap: wrap; }
      .row-actions { width: 100%; }
      .row-actions .btn { flex: 1; }
    }
  `],
})
export class BeautyBookingsComponent implements OnInit, OnDestroy {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  busyId: number | null = null;
  activeTab: 'upcoming' | 'past' | 'all' = 'upcoming';
  now = Date.now();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private isBrowser = false;

  constructor(
    private authService: BeautyAuthService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.tickTimer = setInterval(() => { this.now = Date.now(); }, 1000);
  }
  ngOnDestroy(): void {
    if (this.tickTimer != null) { clearInterval(this.tickTimer); this.tickTimer = null; }
  }

  get upcoming(): BookingItem[] { return (this.data['upcoming'] as BookingItem[]) || []; }
  get past(): BookingItem[] { return (this.data['past'] as BookingItem[]) || []; }

  hueFor(b: BookingItem): string { return HUES[(b.id || 0) % HUES.length]; }

  dateTime(b: BookingItem): string {
    return formatSlotLocal(b.slot_at, b.provider?.timezone) || b.slot_label;
  }
  shortDate(b: BookingItem): string {
    const d = new Date(b.slot_at);
    if (isNaN(d.getTime())) return b.slot_label;
    const o: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    if (b.provider?.timezone) o.timeZone = b.provider.timezone;
    try { return new Intl.DateTimeFormat(undefined, o).format(d); } catch { return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(d); }
  }

  graceRemaining(b: BookingItem): number {
    if (!b.grace_period_ends_at) return 0;
    return Math.max(0, Math.floor((new Date(b.grace_period_ends_at).getTime() - this.now) / 1000));
  }
  graceLabel(b: BookingItem): string {
    const total = this.graceRemaining(b);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  openDetails(b: BookingItem): void {
    const link = b._links?.['detail'];
    if (link) this.followLink.emit(link);
  }
  cancel(b: BookingItem): void {
    const link = b._links?.['cancel'];
    if (!link || this.busyId != null) return;
    this.busyId = b.id;
    this.authService.follow(link).subscribe({
      next: () => { this.busyId = null; const self = this.links['self']; if (self) this.followLink.emit(self); },
      error: () => { this.busyId = null; },
    });
  }
  cancelGrace(b: BookingItem): void {
    const link = b._links?.['cancel_grace'];
    if (!link || this.busyId != null) return;
    this.busyId = b.id;
    this.authService.follow(link).subscribe({
      next: () => { this.busyId = null; const self = this.links['self']; if (self) this.followLink.emit(self); },
      error: () => { this.busyId = null; },
    });
  }

  emit(link: BffLink | null | undefined): void { if (link) this.followLink.emit(link); }

  formatLocal(iso: string | undefined | null, tz?: string | null): string { return formatSlotLocal(iso, tz); }

  isCancelled(status: string): boolean {
    return status === 'cancelled' || status === 'cancelled_by_customer'
      || status === 'cancelled_by_business' || status === 'cancelled_immediate';
  }
  statusLabel(status: string): string {
    switch (status) {
      case 'cancelled_by_business': return 'Provider cancelled';
      case 'cancelled_by_customer': return 'Cancelled';
      case 'cancelled_immediate': return 'Cancelled (free)';
      case 'cancelled': return 'Cancelled';
      case 'completed': return 'Completed';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }
}
