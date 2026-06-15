/**
 * BeautyBusinessBookingsComponent — redesigned per Business Provider Portal handoff (bookings-1).
 * Pill-segmented Upcoming/Past/All tabs · sectioned list w/ date stack + status chip + price · empty state.
 */

import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from './beauty-bff.types';
import { BeautyAuthService } from './beauty-auth.service';
import { BeautyConfirmModalComponent } from './beauty-confirm-modal.component';
import { BeautyProvWebSidebarComponent, ProvWebNav } from './prov-web/prov-web-sidebar.component';
import { BeautyProvWebTopbarComponent } from './prov-web/prov-web-topbar.component';

interface BookingRow {
  id: number;
  status: string;
  slot_at: string;
  slot_label: string;
  service: { id: number; name: string; duration_minutes: number; price_cents: number; price_dollars?: string };
  customer_email: string;
  _links?: Record<string, BffLink>;
}

interface DisplayRow {
  id: number;
  month: string;
  day: string;
  dow: string;
  service: string;
  status: string;
  statusLabel: string;
  time: string;
  duration: number;
  customer: string;
  price: string;
  cancelLink?: BffLink;
}

type Tab = 'Upcoming' | 'Past' | 'All';

@Component({
  selector: 'app-beauty-business-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BeautyConfirmModalComponent,
    BeautyProvWebSidebarComponent,
    BeautyProvWebTopbarComponent,
  ],
  template: `
    <div class="pw-shell">
      <app-prov-web-sidebar
        active="bookings"
        [businessName]="business?.business_name || 'Your storefront'"
        [email]="business?.email || ''"
        [storefrontLive]="storefrontOpen"
        [badges]="navBadges"
        (follow)="emit($event)">
      </app-prov-web-sidebar>

      <div class="pw-main">
        <app-prov-web-topbar
          [businessName]="business?.business_name || 'Your storefront'"
          [email]="business?.email || ''"
          [notifCount]="topBadge"
          (follow)="emit($event)">
        </app-prov-web-topbar>

        <main id="main" class="pw-content">
          <div class="pw-header nb">
            <div class="pw-header-text pw-header-centered">
              <h1 class="pw-title">Bookings</h1>
              <div class="pw-sub">{{ rawUpcoming.length }} upcoming · \${{ expectedTotal }} expected</div>
            </div>
            <div class="pw-header-actions">
              <button type="button" class="wbtn wbtn-secondary" [class.is-active]="showFilters"
                      (click)="showFilters = !showFilters" aria-pressed="showFilters">Filters</button>
              <button type="button" class="wbtn wbtn-secondary" (click)="exportCsv()"
                      [disabled]="!visibleRaw.length">Export</button>
              <button type="button" class="wbtn wbtn-ink" (click)="blockTime()">+ Block time</button>
            </div>
          </div>
          <nav class="pw-tabs" role="tablist" aria-label="Bookings filter">
            <button *ngFor="let t of tabs" type="button" role="tab"
                    class="pw-tab" [class.is-active]="activeTab === t"
                    [attr.aria-selected]="activeTab === t"
                    (click)="activeTab = t">
              {{ t }}<span class="pw-tab-count">{{ countFor(t) }}</span>
            </button>
          </nav>

          <div class="pw-pad">
            <ng-container *ngIf="hasAny; else emptyState">
              <div class="bk-grid">
                <section class="web-card nopad">
                  <div class="bk-card-head">
                    <span class="bk-head-eyebrow">{{ activeTab }}</span>
                    <div class="bk-head-controls">
                      <label class="bk-sort" *ngIf="showFilters" aria-label="Filter by status">
                        <span class="bk-sort-label">Status</span>
                        <select [(ngModel)]="statusFilter" name="bk-status">
                          <option value="all">All</option>
                          <option value="booked">Confirmed</option>
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </label>
                      <label class="bk-sort" aria-label="Sort bookings">
                        <span class="bk-sort-label">Sort</span>
                        <select [(ngModel)]="bkSort" name="bk-sort">
                          <option value="time-asc">Time ↑ (soonest)</option>
                          <option value="time-desc">Time ↓ (latest)</option>
                          <option value="price-asc">Price low → high</option>
                          <option value="price-desc">Price high → low</option>
                        </select>
                      </label>
                    </div>
                  </div>
                  <div *ngFor="let b of visibleRows; let i = index" class="bk-row" [class.first]="i === 0">
                    <div class="date-stack">
                      <div class="ds-month">{{ b.month }}</div>
                      <div class="ds-day">{{ b.day }}</div>
                      <div class="ds-dow">{{ b.dow }}</div>
                    </div>
                    <div class="bk-bar" [class.cancelled]="b.status.startsWith('cancelled')"></div>
                    <div class="bk-info">
                      <div class="bk-svc">{{ b.service }}</div>
                      <div class="bk-meta">
                        <span class="mono">{{ b.time }}</span><span class="dotsep">·</span>
                        <span class="mono">{{ b.duration }} min</span><span class="dotsep">·</span>
                        <span class="mono email">{{ b.customer }}</span>
                      </div>
                    </div>
                    <div class="bk-right">
                      <div class="bk-price mono">\${{ b.price }}</div>
                      <span class="status-chip" [attr.data-status]="b.status">{{ b.statusLabel }}</span>
                    </div>
                    <div class="bk-actions">
                      <button type="button" class="wbtn wbtn-secondary sm" (click)="messageCustomer(b)">Message</button>
                      <button type="button" class="wbtn wbtn-danger-outline sm" *ngIf="b.cancelLink"
                              (click)="askCancel(b)">Cancel</button>
                    </div>
                  </div>
                  <div *ngIf="!visibleRows.length" class="bk-empty-tab">No {{ activeTab.toLowerCase() }} bookings.</div>
                </section>

                <div class="bk-side">
                  <section class="web-card">
                    <div class="side-eyebrow">This week at a glance</div>
                    <div class="glance-grid">
                      <div><div class="glance-label">Bookings</div><div class="glance-val">{{ rawUpcoming.length }}</div></div>
                      <div><div class="glance-label">Hours</div><div class="glance-val">{{ upcomingHours }}</div></div>
                      <div><div class="glance-label">Revenue</div><div class="glance-val">\${{ expectedTotal }}</div></div>
                      <div><div class="glance-label">Customers</div><div class="glance-val">{{ upcomingCustomers }}</div></div>
                    </div>
                  </section>
                  <section class="web-card">
                    <div class="side-eyebrow">Pending action</div>
                    <div class="pa-title">{{ rawUpcoming.length ? 'You\\'re all set' : 'Nothing waiting' }}</div>
                    <div class="pa-body">No bookings need confirmation right now. New requests appear here.</div>
                  </section>
                </div>
              </div>
            </ng-container>

            <ng-template #emptyState>
              <section class="web-card empty-card">
                <div class="empty-ico" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1a3a52" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                </div>
                <h2 class="empty-h2">No bookings yet</h2>
                <div class="empty-body">When customers book your services, they'll show up here.</div>
                <button type="button" class="wbtn wbtn-secondary lg" (click)="emit(links['business_home'])">View storefront ↗</button>
              </section>
            </ng-template>
          </div>
        </main>
      </div>

      <app-beauty-confirm-modal
        *ngIf="pendingCancel"
        [open]="!!pendingCancel"
        [title]="'Cancel this booking?'"
        [body]="cancelBody"
        [primaryLabel]="'Yes, cancel'"
        [secondaryLabel]="'Keep booking'"
        [primaryVariant]="'danger'"
        [busy]="cancelling"
        [busyLabel]="'Cancelling…'"
        (confirmed)="confirmCancel()"
        (dismissed)="pendingCancel = null"
      />
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --ink: #0A0A0B; --danger: #C0392B;
      --success-soft: #E5F3EA; --success-fg: #2F7A47;
      --warn-soft: #FFF4DA; --warn-fg: #8A6A1F;
      --danger-soft: #FCE8E5; --danger-fg: #C0392B;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .pw-shell { display: flex; min-height: 100dvh; background: var(--surface); }
    app-prov-web-sidebar { position: sticky; top: 0; height: 100dvh; }
    .pw-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    app-prov-web-topbar { position: sticky; top: 0; z-index: 5; }
    .pw-content { flex: 1; padding: 0 0 40px; }
    .pw-pad { padding: 20px 28px 28px; }

    .pw-header { position: relative; padding: 24px 28px 4px; }
    .pw-header.nb { padding-bottom: 0; }
    .pw-header-centered { text-align: center; }
    .pw-header-actions { position: absolute; top: 24px; right: 28px; display: flex; gap: 8px; align-items: center; }
    .pw-header-actions .wbtn.is-active { border-color: var(--accent-blue-deep); background: var(--accent-blue); }
    .bk-head-controls { display: inline-flex; gap: 12px; align-items: center; }
    .pw-title { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 500; letter-spacing: 0.2px; line-height: 1.15; }
    .pw-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 6px; }

    /* Header tabs */
    .pw-tabs { display: flex; gap: 4px; padding: 14px 28px 0; border-bottom: 1px solid var(--line); background: #fff; }
    .pw-tab {
      padding: 10px 14px 12px; position: relative; background: none; border: none; cursor: pointer;
      font-family: var(--font-body); font-size: 0.8125rem; font-weight: 500; color: var(--text-muted);
      display: inline-flex; align-items: center; gap: 6px;
    }
    .pw-tab.is-active { color: var(--text); font-weight: 600; }
    .pw-tab.is-active::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--ink); border-radius: 2px; }
    .pw-tab-count { font-family: var(--font-mono); font-size: 0.625rem; font-weight: 600; padding: 1px 5px; border-radius: 999px; border: 1px solid var(--line); }
    .pw-tab.is-active .pw-tab-count { background: var(--surface-2); border: none; }

    /* Buttons */
    .wbtn { height: 40px; padding: 0 16px; border-radius: 10px; cursor: pointer; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid transparent; white-space: nowrap; }
    .wbtn.sm { height: 32px; padding: 0 12px; font-size: 0.75rem; }
    .wbtn.lg { height: 48px; padding: 0 22px; font-size: 0.9375rem; }
    .wbtn-secondary { background: #fff; color: var(--text); border-color: var(--line); }
    .wbtn-secondary:hover { border-color: var(--accent-blue-deep); }
    .wbtn-ghost { background: transparent; color: var(--text); }
    .wbtn-ghost:hover { background: var(--surface-2); }
    .wbtn-danger-outline { background: #fff; color: var(--danger); border-color: rgba(192,57,43,0.4); }
    .wbtn-danger-outline:hover:not(:disabled) { background: var(--danger-soft); }
    .wbtn-ink { background: var(--ink); color: #fff; border-color: var(--ink); }
    .wbtn-ink:hover { background: #1F1F22; }
    .wbtn:disabled { opacity: 0.5; cursor: not-allowed; }

    .web-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }
    .web-card.nopad { overflow: hidden; }

    .bk-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    .bk-card-head { padding: 14px 22px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; }
    .bk-head-eyebrow { font-size: 0.6875rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); }
    .bk-head-sort { font-family: var(--font-mono); font-size: 0.6875rem; color: var(--text-muted); }
    .bk-sort { display: inline-flex; align-items: center; gap: 6px; }
    .bk-sort-label { font-size: 0.625rem; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-muted); }
    .bk-sort select {
      font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; color: var(--text);
      background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 5px 8px; cursor: pointer; min-height: 32px;
    }

    .bk-row { display: flex; align-items: center; gap: 16px; padding: 18px 22px; border-top: 1px solid var(--surface); }
    .bk-row.first { border-top: none; }
    .date-stack { width: 62px; text-align: center; flex-shrink: 0; }
    .ds-month { font-size: 0.5625rem; font-weight: 700; letter-spacing: 1.2px; color: var(--text-muted); }
    .ds-day { font-family: var(--font-display); font-size: 1.875rem; font-weight: 500; line-height: 1; }
    .ds-dow { font-size: 0.625rem; color: var(--text-muted); margin-top: 2px; }
    .bk-bar { width: 4px; height: 56px; background: var(--accent-blue-deep); border-radius: 4px; flex-shrink: 0; }
    .bk-bar.cancelled { background: var(--danger); }
    .bk-info { flex: 1; min-width: 0; }
    .bk-svc { font-family: var(--font-display); font-size: 1.1875rem; font-weight: 500; }
    .bk-meta { font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 8px; margin-top: 4px; align-items: center; flex-wrap: wrap; }
    .bk-meta .mono { font-family: var(--font-mono); }
    .bk-meta .email { color: var(--text); }
    .bk-meta .dotsep { opacity: 0.5; }
    .bk-right { text-align: right; flex-shrink: 0; }
    .bk-price { font-size: 0.9375rem; font-weight: 600; }
    .status-chip { display: inline-block; margin-top: 4px; font-size: 0.5625rem; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; }
    .status-chip[data-status="booked"], .status-chip[data-status="completed"] { background: var(--success-soft); color: var(--success-fg); }
    .status-chip[data-status="pending"] { background: var(--warn-soft); color: var(--warn-fg); }
    .status-chip[data-status^="cancelled"] { background: var(--danger-soft); color: var(--danger-fg); }
    .bk-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .bk-empty-tab { padding: 28px 22px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }

    .bk-side { display: flex; flex-direction: column; gap: 12px; }
    .side-eyebrow { font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; }
    .web-card { padding: 22px; }
    .web-card.nopad { padding: 0; }
    .glance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .glance-label { font-size: 0.6875rem; color: var(--text-muted); }
    .glance-val { font-family: var(--font-display); font-size: 1.375rem; font-weight: 500; margin-top: 2px; }
    .pa-title { font-family: var(--font-display); font-size: 1.125rem; font-weight: 500; }
    .pa-body { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; line-height: 1.5; }

    .empty-card { padding: 56px; text-align: center; }
    .empty-ico { width: 64px; height: 64px; border-radius: 16px; background: var(--accent-blue); margin: 0 auto 18px; display: grid; place-items: center; }
    .empty-h2 { margin: 0; font-family: var(--font-display); font-size: 1.75rem; font-weight: 500; }
    .empty-body { font-size: 0.875rem; color: var(--text-muted); margin: 8px auto 24px; line-height: 1.55; max-width: 420px; }

    @media screen and (max-width: 960px) { .bk-grid { grid-template-columns: 1fr; } }
    @media screen and (max-width: 720px) {
      app-prov-web-sidebar { display: none; }
      .pw-header, .pw-tabs { padding-left: 16px; padding-right: 16px; }
      .pw-pad { padding: 16px; }
      .bk-actions { display: none; }
    }
  `],
})
export class BeautyBusinessBookingsComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  tabs: Tab[] = ['Upcoming', 'Past', 'All'];
  activeTab: Tab = 'Upcoming';
  bkSort: 'time-asc' | 'time-desc' | 'price-asc' | 'price-desc' = 'time-asc';
  showFilters = false;
  statusFilter: 'all' | 'booked' | 'pending' | 'completed' | 'cancelled' = 'all';

  pendingCancel: DisplayRow | null = null;
  cancelling = false;

  constructor(private auth: BeautyAuthService) {}

  get rawUpcoming(): BookingRow[] { return (this.data['upcoming'] as BookingRow[]) || []; }
  get rawPast(): BookingRow[] { return (this.data['past'] as BookingRow[]) || []; }
  get hasAny(): boolean { return this.rawUpcoming.length + this.rawPast.length > 0; }

  get upcomingDisplay(): DisplayRow[] {
    return this.rawUpcoming.map((b) => this.toDisplay(b));
  }
  get pastDisplay(): DisplayRow[] {
    return this.rawPast.map((b) => this.toDisplay(b));
  }

  get tabBadges(): { bookings?: number; messages?: number } {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  private toDisplay(b: BookingRow): DisplayRow {
    const d = new Date(b.slot_at);
    const month = d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
    const day = d.getDate().toString();
    const dow = d.toLocaleDateString(undefined, { weekday: 'short' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const dollars = b.service.price_dollars || ((b.service.price_cents || 0) / 100).toFixed(2);
    return {
      id: b.id, month, day, dow,
      service: b.service.name,
      status: b.status,
      statusLabel: this.label(b.status),
      time,
      duration: b.service.duration_minutes,
      customer: b.customer_email,
      price: dollars,
      cancelLink: b._links?.['cancel'],
    };
  }

  private label(s: string): string {
    if (s === 'booked') return 'Confirmed';
    if (s === 'completed') return 'Completed';
    if (s === 'pending') return 'Pending';
    if (s.startsWith('cancelled')) return 'Cancelled';
    return s;
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  messageCustomer(b: DisplayRow): void {
    this.followLink.emit({
      rel: 'message', href: null, method: 'NAV',
      screen: 'beauty_business_messages', route: `/business/messages/${b.id}`,
      params: { bookingId: b.id }, prompt: 'Message',
    });
  }

  get cancelBody(): string {
    const b = this.pendingCancel;
    if (!b) return '';
    return `${b.service} for ${b.customer} on ${b.month} ${b.day} at ${b.time} will be cancelled. The customer is notified and a refund is owed. This can't be undone.`;
  }

  askCancel(b: DisplayRow): void {
    if (this.cancelling || !b.cancelLink) return;
    this.pendingCancel = b;
  }

  confirmCancel(): void {
    const b = this.pendingCancel;
    if (!b || !b.cancelLink || this.cancelling) return;
    this.cancelling = true;
    this.auth.follow(b.cancelLink).subscribe({
      next: () => {
        this.cancelling = false;
        this.pendingCancel = null;
        // Re-resolve the bookings screen so the cancelled row drops out.
        this.emit(this.links['self']);
      },
      error: () => { this.cancelling = false; this.pendingCancel = null; },
    });
  }

  /** "Block time" → manage availability (per design, opens Weekly hours). */
  blockTime(): void {
    this.followLink.emit(this.links['availability'] || {
      rel: 'nav', href: null, method: 'NAV',
      screen: 'beauty_business_availability', route: '/business/availability', prompt: 'Weekly hours',
    });
  }

  /** Export the currently-visible bookings as a CSV (client-side, no backend). */
  exportCsv(): void {
    const rows = this.visibleRows;
    if (!rows.length) return;
    const head = ['Date', 'Day', 'Time', 'Service', 'Duration (min)', 'Customer', 'Status', 'Price'];
    const esc = (v: string | number) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((b) => [
      `${b.month} ${b.day}`, b.dow, b.time, b.service, b.duration, b.customer, b.statusLabel, `$${b.price}`,
    ].map(esc).join(','));
    const csv = [head.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${this.activeTab.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  get business(): { email?: string; business_name?: string } | null {
    return (this.data['business'] as { email?: string; business_name?: string }) || null;
  }
  get storefrontOpen(): boolean {
    const sf = (this.data['storefront'] as { is_open?: boolean }) || {};
    return sf.is_open !== false;
  }
  get topBadge(): number | null {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    const t = (b.messages_unread || 0) + (b.bookings_unread || 0);
    return t > 0 ? t : null;
  }
  get navBadges(): Partial<Record<ProvWebNav, number>> {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  get visibleRaw(): BookingRow[] {
    let list: BookingRow[];
    if (this.activeTab === 'Past') list = [...this.rawPast];
    else if (this.activeTab === 'All') list = [...this.rawUpcoming, ...this.rawPast];
    else list = [...this.rawUpcoming];
    if (this.showFilters && this.statusFilter !== 'all') {
      list = list.filter((b) =>
        this.statusFilter === 'cancelled'
          ? b.status.startsWith('cancelled')
          : b.status === this.statusFilter);
    }
    const t = (b: BookingRow) => new Date(b.slot_at).getTime();
    const p = (b: BookingRow) => this.priceNum(b);
    switch (this.bkSort) {
      case 'time-desc':  return list.sort((a, b) => t(b) - t(a));
      case 'price-asc':  return list.sort((a, b) => p(a) - p(b));
      case 'price-desc': return list.sort((a, b) => p(b) - p(a));
      case 'time-asc':
      default:           return list.sort((a, b) => t(a) - t(b));
    }
  }

  get visibleRows(): DisplayRow[] {
    return this.visibleRaw.map((b) => this.toDisplay(b));
  }
  countFor(t: Tab): number {
    if (t === 'Past') return this.rawPast.length;
    if (t === 'All') return this.rawUpcoming.length + this.rawPast.length;
    return this.rawUpcoming.length;
  }
  private priceNum(b: BookingRow): number {
    return b.service.price_dollars ? parseFloat(b.service.price_dollars) : (b.service.price_cents || 0) / 100;
  }
  get expectedTotal(): string {
    return this.rawUpcoming.reduce((a, b) => a + this.priceNum(b), 0)
      .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  get upcomingHours(): string {
    const mins = this.rawUpcoming.reduce((a, b) => a + (b.service.duration_minutes || 0), 0);
    return (mins / 60).toFixed(1);
  }
  get upcomingCustomers(): number {
    return new Set(this.rawUpcoming.map((b) => b.customer_email)).size;
  }
}
