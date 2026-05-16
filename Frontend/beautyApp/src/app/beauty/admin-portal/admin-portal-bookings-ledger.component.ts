/**
 * AdminPortalBookingsLedgerComponent — `/admin/portal/bookings`
 *
 * Cross-platform bookings ledger. Slate sub-header with summary stats,
 * search + status filter chips, list of rows linking to booking detail.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import {
  AdmStatusBarComponent,
  AdmHomeIndicatorComponent,
  AdmTopHeaderComponent,
  AdmTabBarComponent,
  AdmFilterChipComponent,
  AdmStatusChipComponent,
} from './atoms';

interface BookingLedgerRow {
  id: number;
  confirmation: string;
  mon: string;
  day: number;
  weekday: string;
  time: string;
  service: string;
  customer_name: string;
  provider_name: string;
  price: string;
  status: 'Confirmed' | 'Cancelled' | 'Pending' | 'Refunded';
}

interface StatusBucket { id: 'All' | 'Upcoming' | 'Pending' | 'Past' | 'Cancelled' | 'Refunded'; count: number; }

@Component({
  selector: 'app-admin-portal-bookings-ledger',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    AdmStatusBarComponent, AdmHomeIndicatorComponent,
    AdmTopHeaderComponent, AdmTabBarComponent,
    AdmFilterChipComponent, AdmStatusChipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-app is-light adm-ledger">
      <adm-status-bar tone="slate"></adm-status-bar>
      <adm-top-header [notifCount]="notifCount"></adm-top-header>

      <!-- Slate sub-header -->
      <section class="sub">
        <h1 class="title adm-display">Bookings ledger</h1>
        <p class="summary">
          <span class="num adm-mono">{{ thisMonth }}</span> this month ·
          <span class="num adm-mono">{{ gmv }}</span> GMV ·
          <span class="num adm-mono">{{ refundRate }}</span> refund rate
        </p>
      </section>

      <!-- Filters -->
      <section class="filters">
        <div class="search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
          </svg>
          <input [(ngModel)]="searchInput" name="q"
                 (keydown.enter)="onSearchSubmit()" (blur)="onSearchSubmit()"
                 placeholder="Booking ID, customer, provider…" />
          <button type="button" class="clear" *ngIf="searchInput" (click)="clearSearch()" aria-label="Clear">×</button>
        </div>

        <div class="chips">
          <adm-filter-chip *ngFor="let b of statusBuckets"
                           [active]="activeStatus === b.id"
                           [count]="b.count"
                           (press)="onStatus(b.id)">
            {{ b.id }}
          </adm-filter-chip>
        </div>
      </section>

      <main class="body adm-body--scroll" role="main">
        <div class="result-row">
          <span class="cnt adm-mono">{{ filteredTotal | number }} bookings</span>
          <label class="sort-wrap">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
            <select class="sort-select" [ngModel]="sort" (ngModelChange)="onSort($event)" aria-label="Sort bookings">
              <option *ngFor="let o of sortOptions" [value]="o.value">{{ o.label }}</option>
            </select>
            <span class="caret">▾</span>
          </label>
        </div>

        <div *ngIf="!rows.length" class="empty">No bookings match these filters.</div>

        <div *ngFor="let r of rows" class="row" role="link" tabindex="0"
             (click)="openBooking(r)"
             (keydown.enter)="openBooking(r)"
             (keydown.space)="openBooking(r); $event.preventDefault()"
             [attr.aria-label]="'Open booking ' + r.confirmation">
          <div class="bk-date">
            <div class="mon">{{ r.mon }}</div>
            <div class="day">{{ r.day }}</div>
            <div class="wd">{{ r.weekday }}</div>
          </div>
          <div class="bk-text">
            <div class="bk-service">{{ r.service }}</div>
            <div class="bk-parties adm-mono">{{ r.customer_name }} → {{ r.provider_name }}</div>
            <div class="bk-meta adm-mono">{{ r.confirmation }} · {{ r.time }}</div>
          </div>
          <div class="bk-right">
            <div class="bk-price adm-mono">{{ r.price }}</div>
            <adm-status-chip [status]="$any(r.status)"></adm-status-chip>
          </div>
        </div>
      </main>

      <adm-tab-bar active="bookings" [badges]="tabBadges" (select)="onTab($event)"></adm-tab-bar>
      <adm-home-indicator tone="slate"></adm-home-indicator>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--surface); }
    .adm-ledger { min-height: 100dvh; }

    .sub { background: var(--adm-slate); color: #fff; padding: 16px 14px; border-bottom: 1px solid var(--adm-slate-line); flex-shrink: 0; }
    .title { margin: 0; font-size: 22px; }
    .summary { margin: 6px 0 0; font-size: 12px; color: var(--adm-slate-muted); }
    .summary .num { color: #fff; font-weight: 600; }

    .filters { background: var(--surface); border-bottom: 1px solid var(--line); padding: 10px 14px; flex-shrink: 0; }
    .search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--line); border-radius: 10px; height: 40px; padding: 0 12px; margin-bottom: 10px; }
    .search input { flex: 1; border: none; outline: none; background: transparent; font-family: var(--adm-font-body); font-size: 13px; color: var(--text); }
    .search input::placeholder { color: var(--text-muted); }
    .clear { background: var(--surface); border: 1px solid var(--line); border-radius: 999px; width: 20px; height: 20px; color: var(--text-muted); cursor: pointer; font-size: 14px; line-height: 1; display: grid; place-items: center; padding: 0; }

    .chips { display: flex; flex-wrap: wrap; gap: 6px; }

    .body { padding: 0 0 24px; background: #fff; }

    .result-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #ECECEE; }
    .result-row .cnt { font-size: 11px; color: var(--text-muted); }
    .sort-label { font-family: var(--adm-font-body); font-size: 11.5px; color: var(--text); font-weight: 600; }
    .sort-wrap { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--text); }
    .sort-select { appearance: none; background: transparent; border: none; font-family: var(--adm-font-body); font-size: 11.5px; color: var(--text); font-weight: 600; padding: 0 18px 0 0; cursor: pointer; outline: none; }
    .sort-wrap .caret { font-size: 9px; opacity: 0.6; margin-left: -16px; pointer-events: none; }

    .empty { padding: 32px 16px; text-align: center; color: var(--text-muted); font-size: 12px; }

    .row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid #ECECEE; cursor: pointer; }
    .row:hover { background: var(--surface); }
    .bk-date { text-align: center; min-width: 40px; flex-shrink: 0; font-family: var(--adm-font-mono); }
    .bk-date .mon { font-size: 8.5px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.4px; }
    .bk-date .day { font-size: 20px; font-weight: 600; color: var(--text); line-height: 1; }
    .bk-date .wd { font-size: 8.5px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.3px; }
    .bk-text { flex: 1; min-width: 0; }
    .bk-service { font-size: 12.5px; color: var(--text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bk-parties { font-size: 10.5px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bk-meta { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
    .bk-right { text-align: right; flex-shrink: 0; }
    .bk-price { font-size: 12.5px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  `],
})
export class AdminPortalBookingsLedgerComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  searchInput = '';
  private lastDataQ = '';

  ngDoCheck(): void {
    const incoming = this.queryValue;
    if (incoming !== this.lastDataQ) {
      this.lastDataQ = incoming;
      this.searchInput = incoming;
    }
  }

  get rows(): BookingLedgerRow[] { return (this.data['rows'] as BookingLedgerRow[]) ?? []; }
  get statusBuckets(): StatusBucket[] { return (this.data['status_buckets'] as StatusBucket[]) ?? []; }
  get activeStatus(): StatusBucket['id'] { return (this.data['active_status'] as StatusBucket['id']) ?? 'All'; }
  get filteredTotal(): number { return (this.data['filtered_total'] as number) ?? this.rows.length; }
  get thisMonth(): string { return ((this.data['this_month_count'] as number) ?? 0).toLocaleString(); }
  get gmv(): string { return (this.data['gmv_label'] as string) ?? '$0'; }
  get refundRate(): string { return (this.data['refund_rate_pct'] as string) ?? '0%'; }
  get queryValue(): string { return (this.data['q'] as string) ?? ''; }
  get sort(): string { return (this.data['sort'] as string) ?? 'newest'; }
  get sortOptions(): { value: string; label: string }[] {
    return (this.data['sort_options'] as { value: string; label: string }[]) ?? [];
  }

  private navWith(extra: Record<string, string | null>): void {
    const cur: Record<string, string> = {};
    if (this.activeStatus !== 'All') cur['status'] = this.activeStatus.toLowerCase();
    if (this.queryValue) cur['q'] = this.queryValue;
    if (this.sort && this.sort !== 'newest') cur['sort'] = this.sort;
    for (const [k, v] of Object.entries(extra)) {
      if (v === null) delete cur[k];
      else cur[k] = v;
    }
    const qs = new URLSearchParams(cur).toString();
    this.followLink.emit({
      rel: 'filter', href: null, method: 'NAV',
      screen: 'beauty_admin_portal_bookings',
      route: '/pogoda/beauty/admin/portal/bookings' + (qs ? '?' + qs : ''),
      prompt: null,
    });
  }

  onStatus(id: StatusBucket['id']): void {
    this.navWith({ status: id === 'All' ? null : id.toLowerCase() });
  }

  onSort(value: string): void {
    if (value === this.sort) return;
    this.navWith({ sort: value === 'newest' ? null : value });
  }

  onSearchSubmit(): void {
    const v = (this.searchInput || '').trim();
    if (v === this.queryValue) return;
    this.navWith({ q: v || null });
  }

  clearSearch(): void {
    this.searchInput = '';
    this.onSearchSubmit();
  }

  openBooking(r: BookingLedgerRow): void {
    const link = this.links['booking_detail'];
    if (!link) return;
    this.followLink.emit({
      ...link,
      route: (link.route ?? '').replace(':id', String(r.id)),
      params: { id: r.id },
    });
  }

  onTab(kind: string): void {
    const link = this.links[kind === 'bookings' ? 'self' : kind];
    if (link) this.followLink.emit(link);
  }

  get tabBadges(): Record<string, number | string | null> {
    return (this.data['tab_badges'] as Record<string, number | string | null>) ?? {};
  }
}
