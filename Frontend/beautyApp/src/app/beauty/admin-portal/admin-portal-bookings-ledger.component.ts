/**
 * AdminPortalBookingsLedgerComponent — `/admin/portal/bookings`
 *
 * Desktop redesign (web) per `web-admin-pages2.jsx` WebAdminLedger: shared slate
 * chrome + page header (summary stats) + a filter bar (search · real status
 * buckets · sort) + a real <table> of bookings. Rows open the admin booking
 * detail (which carries the real customer/provider links).
 *
 * Reactive like the CRM list: search/status/sort live in LOCAL state and
 * self-refetch `bff.resolve(screen, params)` with stale-while-revalidate — no
 * router navigation (it re-mounts the shell and flickers). Debounced live
 * search (~250ms). Mirrors RN `bookings.tsx`.
 *
 * Button audit vs RN: dropped the design's dead controls — Filters / Date
 * picker / Export CSV header buttons, Prev/Next pagination (resolver returns a
 * capped 50, no paging), "All categories / All providers" chips and "Disputed"
 * bucket (no real backing). Real status buckets come from the resolver.
 *
 * @Input/@Output contract unchanged.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import { BeautyBffService } from '../beauty-bff.service';
import { BeautyAdminWebSidebarComponent } from '../admin-web/admin-web-sidebar.component';
import { BeautyAdminWebTopbarComponent } from '../admin-web/admin-web-topbar.component';
import { BeautyAdminWebSessionBarComponent } from '../admin-web/admin-web-session-bar.component';
import { BeautyAdminWebPageHeaderComponent } from '../admin-web/admin-web-page-header.component';

interface BookingLedgerRow {
  id: number; confirmation: string; mon: string; day: number; weekday: string; time: string;
  service: string; customer_name: string; provider_name: string; price: string;
  status: 'Confirmed' | 'Cancelled' | 'Pending' | 'Refunded';
}
interface StatusBucket { id: 'All' | 'Upcoming' | 'Pending' | 'Past' | 'Cancelled' | 'Refunded'; count: number; }

@Component({
  selector: 'app-admin-portal-bookings-ledger',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    BeautyAdminWebSidebarComponent,
    BeautyAdminWebTopbarComponent,
    BeautyAdminWebSessionBarComponent,
    BeautyAdminWebPageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-web aw-shell">
      <app-admin-web-sidebar active="bookings"
        [adminName]="adminName" [adminEmail]="adminEmail" [badges]="navBadges"
        (follow)="followLink.emit($event)"></app-admin-web-sidebar>

      <div class="aw-col">
        <app-admin-web-topbar [notifCount]="notifCount" [adminName]="adminName" [adminEmail]="adminEmail"
          (follow)="followLink.emit($event)"></app-admin-web-topbar>
        <app-admin-web-session-bar [sessionRemaining]="sessionRemaining"
          (follow)="followLink.emit($event)"></app-admin-web-session-bar>

        <main class="aw-main" role="main">
          <app-admin-web-page-header
            [breadcrumb]="['Bookings ledger']"
            title="Bookings ledger"
            [sub]="summaryLine"></app-admin-web-page-header>

          <!-- Filter bar -->
          <div class="aw-filterbar">
            <div class="aw-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
              <input [(ngModel)]="searchInput" name="q" (ngModelChange)="onSearchChange()"
                     (keydown.enter)="onSearchSubmit()" placeholder="Booking ID, customer, provider…" aria-label="Search bookings" />
              <button type="button" class="aw-clear" *ngIf="searchInput" (click)="clearSearch()" aria-label="Clear search">×</button>
            </div>
            <div class="aw-chips" role="tablist" aria-label="Booking status">
              <button type="button" *ngFor="let b of statusBuckets" class="aw-chip"
                      role="tab" [class.is-active]="activeStatus === b.id" [attr.aria-selected]="activeStatus === b.id"
                      (click)="onStatus(b.id)">
                {{ b.id }}<span class="aw-chip-count mono">{{ b.count }}</span>
              </button>
            </div>
            <span class="grow"></span>
            <label class="aw-sort">
              <span class="aw-sort-label">Sort</span>
              <select [ngModel]="sort" (ngModelChange)="onSort($event)" aria-label="Sort bookings">
                <option *ngFor="let o of sortOptions" [value]="o.value">{{ o.label }}</option>
              </select>
            </label>
          </div>

          <div class="aw-body">
            <div class="aw-card aw-tablecard" [class.is-stale]="loading">
              <div class="aw-tabletop">
                <span class="mono">{{ filteredTotal | number }} booking{{ filteredTotal === 1 ? '' : 's' }}</span>
                <span class="aw-loading" *ngIf="loading"><span class="aw-spin" aria-hidden="true"></span> updating…</span>
              </div>
              <table class="aw-table">
                <thead>
                  <tr>
                    <th class="c-date">Date</th>
                    <th class="c-time">Time</th>
                    <th>Service</th>
                    <th>Customer</th>
                    <th>Provider</th>
                    <th class="c-status">Status</th>
                    <th class="c-price">Price</th>
                    <th class="c-id">Booking ID</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of rows" class="aw-trow" role="link" tabindex="0"
                      (click)="openBooking(r)" (keydown.enter)="openBooking(r)"
                      [attr.aria-label]="'Open booking ' + r.confirmation">
                    <td class="c-date mono"><span class="bk-mon">{{ r.mon }}</span> {{ r.day }}</td>
                    <td class="c-time mono">{{ r.time }}</td>
                    <td class="c-svc">{{ r.service }}</td>
                    <td>{{ r.customer_name }}</td>
                    <td class="muted">{{ r.provider_name }}</td>
                    <td class="c-status"><span class="aw-schip" [class.is-bad]="r.status === 'Cancelled' || r.status === 'Refunded'" [class.is-pending]="r.status === 'Pending'">{{ r.status }}</span></td>
                    <td class="c-price mono">{{ r.price }}</td>
                    <td class="c-id mono">{{ r.confirmation }}</td>
                  </tr>
                  <tr *ngIf="!rows.length"><td colspan="8" class="aw-empty">No bookings match these filters.</td></tr>
                </tbody>
              </table>
              <div class="aw-tablefoot mono" *ngIf="rows.length">Showing {{ rows.length | number }} most recent</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --surface: #F2F2F2; --surface-2: #E9E9EB; --danger: #C0392B; --admin-red: #B23A2D;
      --ok: #2F7A47; --warn: #8A6A1F;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh;
    }
    * { box-sizing: border-box; }
    .mono { font-family: var(--font-mono); }
    .grow { flex: 1; }
    .muted { color: var(--text-muted); }

    .aw-shell { display: flex; width: 100%; height: 100dvh; background: var(--surface); font-family: var(--font-body); color: var(--text); overflow: hidden; }
    .aw-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .aw-main { flex: 1; overflow: auto; background: var(--surface); }
    .aw-body { padding: 0 28px 32px; }

    .aw-filterbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 14px 28px; background: #fff; border-bottom: 1px solid var(--line); }
    .aw-search { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; height: 38px; padding: 0 12px; min-width: 280px; }
    .aw-search input { flex: 1; border: none; outline: none; background: transparent; font-family: var(--font-body); font-size: 0.8125rem; color: var(--text); }
    .aw-clear { background: #fff; border: 1px solid var(--line); border-radius: 999px; width: 20px; height: 20px; color: var(--text-muted); cursor: pointer; font-size: 0.875rem; line-height: 1; display: grid; place-items: center; padding: 0; }

    .aw-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .aw-chip { height: 32px; padding: 0 10px; border-radius: 999px; background: #fff; border: 1px solid var(--line); font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; color: var(--text); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .aw-chip.is-active { background: #0F1115; color: #fff; border-color: #0F1115; }
    .aw-chip-count { font-size: 0.625rem; color: var(--text-muted); }
    .aw-chip.is-active .aw-chip-count { color: rgba(255,255,255,0.7); }

    .aw-sort { display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-muted); }
    .aw-sort select { appearance: none; background: #fff; border: 1px solid var(--line); border-radius: 8px; height: 32px; padding: 0 24px 0 10px; font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; color: var(--text); cursor: pointer; outline: none; }

    .aw-tablecard { background: #fff; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; margin-top: 20px; transition: opacity 120ms ease; }
    .aw-tablecard.is-stale { opacity: 0.6; }
    .aw-tabletop { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--line); font-size: 0.6875rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); }
    .aw-loading { display: inline-flex; align-items: center; gap: 6px; text-transform: none; letter-spacing: 0; font-weight: 400; }
    .aw-spin { width: 11px; height: 11px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--text); display: inline-block; animation: aw-spin 0.7s linear infinite; }
    @keyframes aw-spin { to { transform: rotate(360deg); } }

    .aw-table { width: 100%; border-collapse: collapse; }
    .aw-table thead tr { background: var(--surface); border-bottom: 1px solid var(--line); }
    .aw-table th { padding: 10px 12px; font-size: 0.625rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); text-align: left; }
    .aw-table th.c-price { text-align: right; }
    .aw-table td { padding: 12px; font-size: 0.8125rem; vertical-align: middle; border-top: 1px solid var(--surface); }
    .aw-trow { cursor: pointer; }
    .aw-trow:hover { background: #FAFAFA; }
    .c-date { width: 84px; color: var(--text-muted); } .c-date .bk-mon { font-weight: 700; }
    .c-time { width: 88px; color: var(--text-muted); }
    .c-svc { font-weight: 600; }
    .c-status { width: 110px; } .c-price { width: 80px; text-align: right; font-weight: 600; } .c-id { width: 140px; color: var(--text-muted); font-size: 0.75rem; }
    .aw-schip { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; background: #E5F3EA; color: var(--ok); }
    .aw-schip.is-bad { background: #FCE8E5; color: var(--danger); }
    .aw-schip.is-pending { background: #F1E8DA; color: var(--warn); }
    .aw-empty { padding: 28px 16px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }
    .aw-tablefoot { padding: 12px 16px; border-top: 1px solid var(--line); background: #F8F8F8; font-size: 0.6875rem; color: var(--text-muted); }

    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }
  `],
})
export class AdminPortalBookingsLedgerComponent {
  private _data: Record<string, unknown> = {};
  @Input() set data(v: Record<string, unknown>) { this._data = v || {}; this.local = null; this.syncSearch(); }
  get data(): Record<string, unknown> { return this._data; }
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  private local: Record<string, unknown> | null = null;
  private get d(): Record<string, unknown> { return this.local ?? this._data; }

  searchInput = '';
  loading = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private bff: BeautyBffService, private cdr: ChangeDetectorRef) {}

  private syncSearch(): void {
    // Keep the box in sync with server q only when not mid-typing.
    if (this.searchTimer === null) this.searchInput = this.queryValue;
  }

  get notifCount(): number | null { return (this.d['notif_count'] as number | null) ?? null; }
  get adminName(): string { return (this.d['first_name'] as string) || 'Maria R.'; }
  get adminEmail(): string { return (this.d['admin_email'] as string) || 'maria@beauty.io'; }
  get sessionRemaining(): string { return (this.d['session_remaining'] as string) ?? '14:32'; }
  get navBadges(): Record<string, number> {
    const badges = (this.d['tab_badges'] as Record<string, number | null>) ?? {};
    const out: Record<string, number> = {};
    if (badges['tickets']) out['tickets'] = badges['tickets'] as number;
    return out;
  }

  get rows(): BookingLedgerRow[] { return (this.d['rows'] as BookingLedgerRow[]) ?? []; }
  get statusBuckets(): StatusBucket[] { return (this.d['status_buckets'] as StatusBucket[]) ?? []; }
  get activeStatus(): StatusBucket['id'] { return (this.d['active_status'] as StatusBucket['id']) ?? 'All'; }
  get filteredTotal(): number { return (this.d['filtered_total'] as number) ?? this.rows.length; }
  get thisMonth(): string { return ((this.d['this_month_count'] as number) ?? 0).toLocaleString(); }
  get gmv(): string { return (this.d['gmv_label'] as string) ?? '$0'; }
  get refundRate(): string { return (this.d['refund_rate_pct'] as string) ?? '0%'; }
  get summaryLine(): string { return `${this.thisMonth} this month · ${this.gmv} GMV · ${this.refundRate} refund rate`; }
  get queryValue(): string { return (this.d['q'] as string) ?? ''; }
  get sort(): string { return (this.d['sort'] as string) ?? 'newest'; }
  get sortOptions(): { value: string; label: string }[] { return (this.d['sort_options'] as { value: string; label: string }[]) ?? []; }

  /** Build the resolver params from current local filter state. */
  private currentParams(extra: Record<string, string | null> = {}): Record<string, string | number> {
    const cur: Record<string, string> = {};
    if (this.activeStatus !== 'All') cur['status'] = this.activeStatus.toLowerCase();
    if (this.queryValue) cur['q'] = this.queryValue;
    if (this.sort && this.sort !== 'newest') cur['sort'] = this.sort;
    for (const [k, v] of Object.entries(extra)) {
      if (v === null) delete cur[k];
      else cur[k] = v;
    }
    return cur;
  }

  /** Self-refetch in place (stale-while-revalidate). No router navigation. */
  private refetch(params: Record<string, string | number>): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.bff.resolve('beauty_admin_portal_bookings', params).subscribe({
      next: (resp) => {
        if (resp && resp.action === 'render' && resp.data) { this.local = resp.data as Record<string, unknown>; }
        this.loading = false;
        if (this.searchTimer === null) this.searchInput = this.queryValue;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  onStatus(id: StatusBucket['id']): void {
    if (id === this.activeStatus) return;
    this.refetch(this.currentParams({ status: id === 'All' ? null : id.toLowerCase() }));
  }

  onSort(value: string): void {
    if (value === this.sort) return;
    this.refetch(this.currentParams({ sort: value === 'newest' ? null : value }));
  }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      const v = (this.searchInput || '').trim();
      if (v === this.queryValue) return;
      this.refetch(this.currentParams({ q: v || null }));
    }, 250);
  }

  onSearchSubmit(): void {
    if (this.searchTimer) { clearTimeout(this.searchTimer); this.searchTimer = null; }
    const v = (this.searchInput || '').trim();
    if (v === this.queryValue) return;
    this.refetch(this.currentParams({ q: v || null }));
  }

  clearSearch(): void {
    this.searchInput = '';
    this.onSearchSubmit();
  }

  openBooking(r: BookingLedgerRow): void {
    const link = this.links['booking_detail'];
    if (!link) return;
    this.followLink.emit({ ...link, route: (link.route ?? '').replace(':id', String(r.id)), params: { id: r.id } });
  }
}
