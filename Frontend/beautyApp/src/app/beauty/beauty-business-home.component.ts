/**
 * BeautyBusinessHomeComponent
 * ---------------------------
 * Replacement for the small-stat-card dashboard. Shows:
 *  - month calendar where each day cell carries the count of bookings
 *    on that day; tapping a day expands a list of bookings.
 *  - earnings gauge (current vs. monthly target).
 *  - bookings volume gauge with category breakdown + new-vs-recurring split.
 *
 * Calendar is keyboard-navigable: arrow keys move focus between days,
 * Enter expands. Today is highlighted.
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';

interface DayCell {
  date: string;          // 'YYYY-MM-DD' or '' for blank cells
  day: number | null;    // 1..31
  isToday: boolean;
  inMonth: boolean;
  count: number;
}

interface BookingItem {
  id: number;
  customer_email: string;
  service_name: string;
  slot_at: string;
  status: string;
  price_cents: number;
  duration_minutes: number;
}

interface DashboardStats {
  earnings_cents: number;
  earnings_target_cents: number;
  bookings_count: number;
  by_category: Record<string, number>;
  new_clients: number;
  recurring_clients: number;
}

@Component({
  selector: 'app-beauty-business-home',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="business-shell business-home" role="region" aria-label="Business dashboard">
      <header class="biz-header">
        <div class="brand-block">
          <span class="brand-icon" aria-hidden="true">🏢</span>
          <button class="brand-name-btn" (click)="emit(links['home'])">Beauty</button>
          <span class="badge">Business Portal</span>
        </div>
        <div class="header-actions">
          <button class="btn btn--size-sm btn-outline" (click)="emit(links['services'])"
                  *ngIf="links['services']">Services</button>
          <button class="btn btn--size-sm btn-outline" (click)="emit(links['availability'])"
                  *ngIf="links['availability']">Hours</button>
          <button class="btn btn--size-sm btn-outline" (click)="emit(links['bookings'])"
                  *ngIf="links['bookings']">Bookings</button>
          <button class="btn btn--size-sm btn-outline-danger" (click)="logout()"
                  [class.is-loading]="loggingOut" [disabled]="loggingOut">Sign out</button>
        </div>
      </header>

      <main id="main" class="biz-section">
        <h1 class="biz-title">{{ business?.business_name || 'Your storefront' }}</h1>
        <p class="biz-sub">{{ business?.email }}</p>

        <section class="calendar-section" aria-labelledby="cal-h">
          <header class="cal-head">
            <h2 id="cal-h">{{ monthLabel }}</h2>
          </header>
          <div role="grid" aria-readonly="true" class="cal-grid"
               [attr.aria-label]="'Bookings for ' + monthLabel"
               (keydown)="onCalendarKeydown($event)">
            <div role="row" class="cal-dow">
              <span role="columnheader" *ngFor="let d of daysOfWeek">{{ d }}</span>
            </div>
            <div role="row" *ngFor="let week of weeks; let r = index" class="cal-row">
              <button
                *ngFor="let cell of week; let c = index"
                role="gridcell"
                class="cal-cell"
                type="button"
                [attr.tabindex]="cell.inMonth ? (cell.date === focusedDate ? 0 : -1) : -1"
                [attr.data-date]="cell.date || null"
                [attr.aria-label]="cellAriaLabel(cell)"
                [class.is-today]="cell.isToday"
                [class.is-selected]="cell.date === selectedDate"
                [class.has-bookings]="cell.count > 0"
                [class.is-blank]="!cell.inMonth"
                [disabled]="!cell.inMonth"
                (focus)="cell.inMonth && (focusedDate = cell.date)"
                (click)="cell.inMonth && selectDay(cell.date)">
                <span class="cal-day">{{ cell.day }}</span>
                <span *ngIf="cell.count > 0" class="cal-count" aria-hidden="true">{{ cell.count }}</span>
              </button>
            </div>
          </div>

          <div *ngIf="selectedDate" class="day-bookings"
               [attr.aria-label]="'Bookings on ' + selectedDate">
            <h3>{{ selectedDate }}</h3>
            <ul *ngIf="(monthBookings[selectedDate] || []).length; else noBookings">
              <li *ngFor="let b of monthBookings[selectedDate]" class="day-booking">
                <strong>{{ formatTime(b.slot_at) }}</strong>
                <span>{{ b.service_name }}</span>
                <span class="muted">{{ b.customer_email }}</span>
                <span class="status" [attr.data-status]="b.status">{{ b.status }}</span>
              </li>
            </ul>
            <ng-template #noBookings>
              <p class="muted">No bookings this day.</p>
            </ng-template>
          </div>
        </section>

        <section class="gauges">
          <div class="gauge-card" aria-labelledby="g1-h">
            <h2 id="g1-h">Earnings · {{ monthLabel }}</h2>
            <svg class="arc" viewBox="0 0 200 110" aria-hidden="true">
              <path class="arc-track" d="M10,100 A90,90 0 0,1 190,100" />
              <path class="arc-fill" [attr.d]="earningsArcPath()" />
            </svg>
            <div class="arc-value">
              <strong>{{ formatCurrency(stats.earnings_cents) }}</strong>
              <span class="muted">of {{ formatCurrency(stats.earnings_target_cents) }} target</span>
            </div>
          </div>

          <div class="gauge-card" aria-labelledby="g2-h">
            <h2 id="g2-h">Bookings volume</h2>
            <div class="big-num"><strong>{{ stats.bookings_count }}</strong> <span class="muted">this month</span></div>
            <ul class="cat-list">
              <li *ngFor="let c of categoryRows()" [attr.data-cat]="c.key">
                <span class="cat-label">{{ c.label }}</span>
                <span class="cat-bar">
                  <span class="cat-bar-fill" [style.width.%]="c.pct"></span>
                </span>
                <span class="cat-count">{{ c.count }}</span>
              </li>
            </ul>
            <div class="client-split">
              <div class="split">
                <strong>{{ stats.new_clients }}</strong>
                <span>New</span>
              </div>
              <div class="split">
                <strong>{{ stats.recurring_clients }}</strong>
                <span>Recurring</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styleUrls: ['./beauty-business-home.component.scss'],
})
export class BeautyBusinessHomeComponent implements OnChanges {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  readonly daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weeks: DayCell[][] = [];
  monthLabel = '';
  selectedDate: string | null = null;
  focusedDate = '';
  monthBookings: Record<string, BookingItem[]> = {};
  stats: DashboardStats = {
    earnings_cents: 0, earnings_target_cents: 500000,
    bookings_count: 0, by_category: {}, new_clients: 0, recurring_clients: 0,
  };
  loggingOut = false;

  constructor(private auth: BeautyAuthService) {}

  get business(): { email?: string; business_name?: string } | null {
    return (this.data['business'] as { email?: string; business_name?: string }) || null;
  }

  ngOnChanges(_: SimpleChanges): void {
    const month = (this.data['month'] as string) || '';
    const today = (this.data['today'] as string) || '';
    this.monthBookings = (this.data['month_bookings'] as Record<string, BookingItem[]>) || {};
    this.stats = (this.data['stats'] as DashboardStats) || this.stats;

    const [yStr, mStr] = (month || '').split('-');
    const y = Number(yStr) || new Date().getUTCFullYear();
    const m = (Number(mStr) || (new Date().getUTCMonth() + 1)) - 1;
    this.monthLabel = new Date(Date.UTC(y, m, 1)).toLocaleDateString(undefined, {
      month: 'long', year: 'numeric', timeZone: 'UTC',
    });

    this.weeks = this.buildMonthGrid(y, m, today);
    if (!this.focusedDate) this.focusedDate = today;
  }

  private buildMonthGrid(year: number, monthIdx: number, today: string): DayCell[][] {
    const firstOfMonth = new Date(Date.UTC(year, monthIdx, 1));
    const lastOfMonth = new Date(Date.UTC(year, monthIdx + 1, 0));
    const startDay = firstOfMonth.getUTCDay(); // 0 = Sun
    const daysInMonth = lastOfMonth.getUTCDate();

    const cells: DayCell[] = [];
    for (let i = 0; i < startDay; i++) {
      cells.push({ date: '', day: null, isToday: false, inMonth: false, count: 0 });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        date,
        day: d,
        isToday: date === today,
        inMonth: true,
        count: (this.monthBookings[date] || []).length,
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: '', day: null, isToday: false, inMonth: false, count: 0 });
    }
    const rows: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }

  cellAriaLabel(cell: DayCell): string {
    if (!cell.inMonth) return '';
    const base = cell.date;
    const tag = cell.isToday ? ' (today)' : '';
    return cell.count > 0 ? `${base}${tag}, ${cell.count} bookings` : `${base}${tag}, no bookings`;
  }

  selectDay(date: string): void {
    this.selectedDate = this.selectedDate === date ? null : date;
  }

  onCalendarKeydown(e: KeyboardEvent): void {
    const offsets: Record<string, number> = {
      ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7,
    };
    if (e.key === 'Enter' || e.key === ' ') {
      if (this.focusedDate) {
        this.selectDay(this.focusedDate);
        e.preventDefault();
      }
      return;
    }
    const offset = offsets[e.key];
    if (offset === undefined) return;
    e.preventDefault();
    const cur = this.focusedDate || (this.data['today'] as string);
    if (!cur) return;
    const cd = new Date(cur + 'T00:00:00Z');
    cd.setUTCDate(cd.getUTCDate() + offset);
    const newDate = cd.toISOString().slice(0, 10);
    this.focusedDate = newDate;
    queueMicrotask(() => {
      const el = document.querySelector<HTMLElement>(`.cal-cell[data-date='${newDate}']`);
      el?.focus();
    });
  }

  earningsArcPath(): string {
    const ratio = Math.max(0, Math.min(1, (this.stats.earnings_cents || 0) / Math.max(1, this.stats.earnings_target_cents)));
    // Sweep from 180° to 0° (left to right), partial arc proportional to ratio.
    const cx = 100, cy = 100, r = 90;
    const startAngle = Math.PI; // 180°
    const endAngle = Math.PI - (ratio * Math.PI);
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = ratio > 0.5 ? 1 : 0;
    return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${largeArc},1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
  }

  categoryRows(): { key: string; label: string; count: number; pct: number }[] {
    const labels: Record<string, string> = {
      facial: 'Facials', massage: 'Massage', nails: 'Nails', hair: 'Hair', other: 'Other',
    };
    const total = Object.values(this.stats.by_category || {}).reduce((a, b) => a + (b || 0), 0) || 1;
    return Object.entries(this.stats.by_category || {})
      .map(([key, count]) => ({
        key,
        label: labels[key] || key,
        count: count as number,
        pct: Math.round(((count as number) / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }

  formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
  }

  formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  logout(): void {
    const link = this.links['logout'];
    if (!link || this.loggingOut) return;
    this.loggingOut = true;
    this.auth.follow(link).subscribe({
      next: () => {
        this.loggingOut = false;
        this.followLink.emit({
          rel: 'home', href: null, method: 'NAV',
          screen: 'beauty_business_login', route: '/business/login', prompt: 'Sign in',
        });
      },
      error: () => {
        this.loggingOut = false;
        this.followLink.emit({
          rel: 'home', href: null, method: 'NAV',
          screen: 'beauty_business_login', route: '/business/login', prompt: 'Sign in',
        });
      },
    });
  }
}
