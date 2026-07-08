/**
 * BeautyBusinessHomeComponent — redesigned per Business Provider Portal handoff (dash-v1).
 * Layout: top header + greeting row + month calendar + earnings/volume row + bottom tab bar.
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
import { HttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';
import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyProvWebSidebarComponent, ProvWebNav } from './prov-web/prov-web-sidebar.component';
import { BeautyProvWebTopbarComponent } from './prov-web/prov-web-topbar.component';

interface DayCell {
  date: string;
  day: number | null;
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
  price_dollars?: string;
  duration_minutes: number;
}

interface DashboardStats {
  earnings_cents: number;
  earnings_target_cents: number;
  earnings_dollars?: string;
  earnings_target_dollars?: string;
  bookings_count: number;
  by_category: Record<string, number>;
  new_clients: number;
  recurring_clients: number;
  rating?: number | null;
  review_count?: number;
  conversion_pct?: number;
}

@Component({
  selector: 'app-beauty-business-home',
  standalone: true,
  imports: [
    CommonModule,
    BeautyProvWebSidebarComponent,
    BeautyProvWebTopbarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="pw-shell">
      <app-prov-web-sidebar
        active="dashboard"
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

        <!-- ─── Populated ─── -->
        <main id="main" class="pw-content" *ngIf="!showEmpty">
          <div class="pw-header">
            <div class="pw-header-text pw-header-text-centered">
              <h1 class="pw-title">{{ greeting }}, {{ business?.business_name || 'there' }}.</h1>
              <div class="pw-sub">{{ todayLabel }} · {{ todayBookings.length }} booking{{ todayBookings.length === 1 ? '' : 's' }} today</div>
            </div>
            <div class="pw-header-actions">
              <button type="button" class="wbtn wbtn-secondary" (click)="goToReviews()">View storefront ↗</button>
              <button type="button" class="wbtn wbtn-ink" (click)="emit(resolveAvailability())">+ Block off time</button>
            </div>
          </div>

          <div class="kpi-grid">
            <div class="kpi">
              <div class="kpi-label">This month · earnings</div>
              <div class="kpi-value accent">\${{ earningsDollars }}</div>
              <div class="kpi-sub">Goal \${{ targetDollars }} · {{ earningsPct }}%</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Bookings · this month</div>
              <div class="kpi-value">{{ stats.bookings_count }}</div>
              <div class="kpi-sub">{{ stats.new_clients }} new · {{ stats.recurring_clients }} recurring</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Conversion · 30d</div>
              <div class="kpi-value">{{ conversionPct }}%</div>
              <div class="kpi-sub">Booked vs requests</div>
            </div>
            <div class="kpi">
              <div class="kpi-label">Rating</div>
              <div class="kpi-value">{{ ratingLabel }}</div>
              <div class="kpi-sub">{{ reviewCount }} review{{ reviewCount === 1 ? '' : 's' }}{{ servicesCount ? ' · ' + servicesCount + ' services' : '' }}</div>
            </div>
          </div>

          <div class="dash-grid">
            <section class="web-card cal-card">
              <div class="cal-head">
                <h2 class="cal-month">{{ monthLabel }}</h2>
                <div class="cal-nav">
                  <button type="button" class="cal-nav-btn" (click)="navigateMonth(-1)" aria-label="Previous month">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <button type="button" class="cal-nav-btn" (click)="navigateMonth(1)" aria-label="Next month">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
                  </button>
                </div>
              </div>
              <div role="grid" class="cal-grid" [attr.aria-label]="'Bookings for ' + monthLabel" (keydown)="onCalendarKeydown($event)">
                <div role="row" class="cal-dow">
                  <span role="columnheader" *ngFor="let d of daysOfWeek">{{ d }}</span>
                </div>
                <div role="row" *ngFor="let week of weeks" class="cal-row">
                  <button *ngFor="let cell of week" role="gridcell" class="cal-cell" type="button"
                    [attr.tabindex]="cell.inMonth ? (cell.date === focusedDate ? 0 : -1) : -1"
                    [attr.data-date]="cell.date || null" [attr.aria-label]="cellAriaLabel(cell)"
                    [class.is-today]="cell.isToday" [class.is-selected]="cell.date === selectedDate"
                    [class.has-bookings]="cell.count > 0" [class.is-blank]="!cell.inMonth"
                    [disabled]="!cell.inMonth"
                    (focus)="cell.inMonth && (focusedDate = cell.date)"
                    (click)="cell.inMonth && selectDay(cell.date)">
                    <span class="cal-day">{{ cell.day }}</span>
                    <span *ngIf="cell.count > 0" class="cal-pip" aria-hidden="true"></span>
                  </button>
                </div>
              </div>
              <div *ngIf="selectedDate && (monthBookings[selectedDate] || []).length" class="day-bookings" [attr.aria-label]="'Bookings on ' + selectedDate">
                <div class="day-head">{{ selectedDate }}</div>
                <ul>
                  <li *ngFor="let b of monthBookings[selectedDate]" class="day-booking">
                    <strong>{{ formatTime(b.slot_at) }}</strong>
                    <span class="svc">{{ b.service_name }}</span>
                    <span class="cust">{{ b.customer_email }}</span>
                  </li>
                </ul>
              </div>
            </section>

            <div class="dash-side">
              <section class="web-card">
                <div class="card-head-row">
                  <h3 class="card-h3">This month</h3>
                  <a class="card-link" (click)="goToReviews()" tabindex="0" role="link">Payouts →</a>
                </div>
                <div class="arc-wrap">
                  <svg class="arc" viewBox="0 0 152 90" aria-hidden="true">
                    <path class="arc-track" d="M 6 76 A 70 70 0 0 1 146 76" stroke-dasharray="6 8"/>
                    <path class="arc-fill" [attr.d]="arcPath" [attr.stroke-dasharray]="arcDash"/>
                    <circle class="arc-dot-outer" [attr.cx]="dotX" [attr.cy]="dotY" r="9"/>
                    <circle class="arc-dot-inner" [attr.cx]="dotX" [attr.cy]="dotY" r="3"/>
                  </svg>
                  <div class="arc-value">
                    <strong>\${{ earningsDollars }}</strong>
                    <span class="arc-sub">of \${{ targetDollars }} target · {{ earningsPct }}%</span>
                  </div>
                </div>
              </section>

              <section class="web-card">
                <h3 class="card-h3">Bookings volume</h3>
                <div class="vol-row">
                  <div class="vol-total">
                    <strong>{{ stats.bookings_count }}</strong>
                    <span>this month</span>
                  </div>
                  <div class="vol-meter">
                    <div class="vol-bar">
                      <span class="vb-new" [style.flex]="stats.new_clients || 1"></span>
                      <span class="vb-ret" [style.flex]="stats.recurring_clients || 1"></span>
                    </div>
                    <div class="vol-legend">
                      <span><i class="dot new"></i>{{ stats.new_clients }} New</span>
                      <span><i class="dot ret"></i>{{ stats.recurring_clients }} Returning</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <section class="web-card sched-card">
            <div class="sched-head">
              <div>
                <h2 class="sched-title">Today's schedule</h2>
                <div class="sched-sub">{{ todayLabel }} · {{ todayBookings.length }} booking{{ todayBookings.length === 1 ? '' : 's' }}</div>
              </div>
            </div>
            <ng-container *ngIf="todayBookings.length; else schedEmpty">
              <div *ngFor="let b of todayBookings; let i = index" class="sched-row" [class.first]="i === 0">
                <div class="sched-time">
                  <div class="st-h">{{ formatTimeH(b.slot_at) }}</div>
                  <div class="st-ap">{{ formatTimeAP(b.slot_at) }}</div>
                </div>
                <div class="sched-bar" [class.pending]="isPending(b.status)"></div>
                <div class="sched-info">
                  <div class="si-svc">{{ b.service_name }}</div>
                  <div class="si-meta">
                    <span>{{ b.customer_email }}</span><span class="dotsep">·</span>
                    <span class="mono">{{ b.duration_minutes }} min</span><span class="dotsep">·</span>
                    <span class="mono price">{{ priceOf(b) }}</span>
                  </div>
                </div>
                <span class="status-chip" [class.pending]="isPending(b.status)">{{ statusLabel(b.status) }}</span>
                <button type="button" class="wbtn wbtn-secondary sm" (click)="messageCustomer(b)">Message</button>
                <button type="button" class="wbtn wbtn-ghost sm" (click)="emit(links['bookings'])">Open →</button>
              </div>
            </ng-container>
            <ng-template #schedEmpty>
              <div class="sched-empty">No bookings today.</div>
            </ng-template>
          </section>
        </main>

        <!-- ─── Empty (first-time setup) ─── -->
        <main id="main" class="pw-content" *ngIf="showEmpty">
          <div class="pw-header pw-header-centered">
            <div class="pw-header-text">
              <h1 class="pw-title">Welcome to Beauty.</h1>
              <div class="pw-sub">Let's get your storefront live. Three things to do.</div>
            </div>
          </div>

          <div class="dash-grid">
            <section class="web-card nopad">
              <div class="checklist-head">
                <h2 class="sched-title">First-time setup</h2>
                <div class="sched-sub">1 of 3 complete</div>
              </div>
              <button type="button" class="ck-row done" disabled>
                <span class="ck-bubble done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4L19 7"/></svg></span>
                <div class="ck-text">
                  <div class="ck-label done">Create your account</div>
                  <div class="ck-sub">{{ business?.email || '' }}</div>
                </div>
              </button>
              <button type="button" class="ck-row" (click)="emit(links['services'])" [disabled]="!links['services']">
                <span class="ck-bubble">2</span>
                <div class="ck-text">
                  <div class="ck-label">Add your first service</div>
                  <div class="ck-sub">Customers can't book until you list at least one service.</div>
                </div>
                <span class="wbtn wbtn-green sm">Add a service →</span>
              </button>
              <button type="button" class="ck-row last" (click)="emit(links['availability'])" [disabled]="!links['availability']">
                <span class="ck-bubble">3</span>
                <div class="ck-text">
                  <div class="ck-label">Set your weekly hours</div>
                  <div class="ck-sub">Tell us when you're open so we can show availability.</div>
                </div>
                <span class="wbtn wbtn-green sm">Set hours →</span>
              </button>
            </section>

            <section class="web-card preview-card">
              <h3 class="card-h3">Storefront preview</h3>
              <div class="preview-sub">What customers will see once you go live</div>
              <div class="preview-frame">
                <div class="preview-name">{{ business?.business_name || 'Your storefront' }}</div>
                <div class="preview-hint">add services to go live</div>
              </div>
              <button type="button" class="wbtn wbtn-secondary full" (click)="goToReviews()">Preview as customer ↗</button>
            </section>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF;
      --ink: #0A0A0B; --success: #2F7A47;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
      background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .prov-shell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--surface);
      color: var(--text);
      font-family: var(--font-body);
    }
    .prov-body {
      flex: 1;
      padding: 16px 16px 12px;
      overflow-y: auto;
    }

    /* Greeting */
    .greet-row {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 14px;
    }
    .avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #BFD8EE, #7DA8CF);
      display: grid; place-items: center;
      font-family: var(--font-display);
      font-size: 18px; font-weight: 500;
      color: #1a3a52;
      flex-shrink: 0;
    }
    .greet-text { flex: 1; min-width: 0; }
    .biz-name {
      font-family: var(--font-display);
      font-size: 20px; font-weight: 500;
      letter-spacing: 0.2px;
      line-height: 1.1;
      color: var(--text);
    }
    .biz-email {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 2px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .status-pill {
      min-height: 44px; padding: 0 12px;
      border-radius: 999px;
      background: #FFFFFF;
      border: 1px solid var(--line);
      font-size: 11px; font-weight: 600;
      color: var(--text);
      cursor: pointer;
      display: inline-flex; align-items: center; gap: 5px;
    }
    .status-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--success);
    }
    .status-dot.is-closed { background: #C0392B; }

    /* Calendar */
    .cal-card { display: block; margin-bottom: 12px; }
    .cal-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px;
    }
    .cal-month {
      margin: 0;
      font-family: var(--font-display);
      font-size: 20px; font-weight: 500;
      letter-spacing: 0.2px;
      color: var(--text);
    }
    .cal-nav { display: flex; gap: 4px; }
    .cal-nav-btn {
      width: 32px; height: 32px;
      min-width: 32px; min-height: 32px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid var(--line);
      cursor: pointer;
      display: grid; place-items: center;
      color: var(--text-muted);
    }
    .cal-grid { display: grid; gap: 0; }
    .cal-dow {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
      margin-bottom: 6px;
    }
    .cal-dow span {
      text-align: center;
      font-size: 10px; font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.4px;
      padding: 4px 0;
    }
    .cal-row {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
      margin-bottom: 4px;
    }
    .cal-cell {
      aspect-ratio: 1;
      border-radius: 8px;
      background: #FFFFFF;
      border: 1px solid var(--line);
      cursor: pointer;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: var(--font-body);
      font-size: 12px; font-weight: 500;
      color: var(--text);
      position: relative;
      padding: 0;
    }
    .cal-cell.is-today {
      background: var(--accent-blue);
      border: 1.5px solid var(--accent-blue-deep);
      color: #1a3a52;
      font-weight: 700;
    }
    .cal-cell.is-selected {
      outline: 2px solid var(--accent-blue-deep);
      outline-offset: -2px;
    }
    .cal-cell.is-blank {
      background: transparent;
      border: none;
      cursor: default;
    }
    .cal-pip {
      position: absolute;
      bottom: 3px;
      width: 4px; height: 4px;
      border-radius: 50%;
      background: var(--accent-blue-deep);
    }
    .cal-cell.is-today .cal-pip { background: #1a3a52; }

    .day-bookings {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
    }
    .day-head {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .day-bookings ul { list-style: none; padding: 0; margin: 0; }
    .day-booking {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 8px;
      padding: 6px 0;
      font-size: 12px;
      align-items: baseline;
    }
    .day-booking strong { font-family: var(--font-mono); font-weight: 700; }
    .day-booking .svc { color: var(--text); font-weight: 500; }
    .day-booking .cust { color: var(--text-muted); font-size: 10px; }

    /* Quick action tiles */
    .qa-row { display: flex; gap: 8px; margin-bottom: 12px; }
    .qa-tile {
      flex: 1;
      display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
      padding: 12px;
      border-radius: 14px;
      background: #FFFFFF;
      color: var(--text);
      border: 1px solid var(--line);
      cursor: pointer;
      font-family: var(--font-body);
      min-width: 0; min-height: 44px;
      text-align: left;
    }
    .qa-tile.primary {
      background: var(--text);
      color: #FFFFFF;
      border-color: var(--text);
    }
    .qa-icon-wrap {
      width: 32px; height: 32px;
      flex-shrink: 0;
      border-radius: 10px;
      background: var(--accent-blue);
      color: #1a3a52;
      display: grid; place-items: center;
    }
    .qa-icon-wrap.primary {
      background: rgba(255,255,255,0.14);
      color: #FFFFFF;
    }
    .qa-text { width: 100%; min-width: 0; display: block; }
    .qa-label {
      display: block;
      font-size: 13px; font-weight: 600;
      line-height: 1.15;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .qa-sub {
      display: block;
      font-size: 10px; margin-top: 2px;
      color: var(--text-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .qa-tile.primary .qa-sub { color: rgba(255,255,255,0.7); }

    /* Stats row */
    .stats-row {
      display: flex; gap: 10px;
    }
    .earn-card { flex: 1.1; display: block; min-width: 0; }
    .vol-card { flex: 1; display: block; min-width: 0; }
    .card-eyebrow {
      font-family: var(--font-body);
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .card-month {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    /* Earnings arc */
    .arc-wrap { position: relative; margin-top: 8px; padding: 0 12px; }
    .arc { display: block; width: 100%; height: auto; max-width: 180px; margin: 0 auto; }
    .arc-track { fill: none; stroke: var(--line); stroke-width: 12; stroke-linecap: round; }
    .arc-fill { fill: none; stroke: var(--accent-blue-deep); stroke-width: 12; stroke-linecap: round; }
    .arc-dot-outer { fill: #fff; stroke: var(--accent-blue-deep); stroke-width: 2; }
    .arc-dot-inner { fill: var(--success); }
    .arc-value {
      text-align: center;
      margin-top: -8px;
    }
    .arc-value strong {
      display: block;
      font-family: var(--font-body);
      font-size: 22px; font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text);
      line-height: 1;
    }
    .arc-sub {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 4px;
      display: block;
    }

    /* Volume */
    .vol-total {
      display: flex; align-items: baseline; gap: 6px;
      margin: 8px 0 12px;
    }
    .vol-total strong {
      font-family: var(--font-body);
      font-size: 32px; font-weight: 700;
      font-variant-numeric: tabular-nums;
      line-height: 1;
      color: var(--text);
    }
    .vol-total span { font-size: 11px; color: var(--text-muted); }
    .vol-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    }
    .vol-cell {
      background: var(--surface);
      border-radius: 8px;
      padding: 8px 10px;
      border: 1px solid var(--line);
    }
    .vol-num {
      font-family: var(--font-body);
      font-size: 20px; font-weight: 700;
      font-variant-numeric: tabular-nums;
      line-height: 1;
      color: var(--text);
    }
    .vol-label {
      font-size: 10px; font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.4px;
      margin-top: 4px;
    }

    /* Empty */
    .empty-greet { margin-bottom: 12px; }
    .empty-title {
      font-family: var(--font-display);
      font-size: 22px; font-weight: 500;
      color: var(--text);
      letter-spacing: 0.2px;
    }
    .empty-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .checklist-card { display: block; overflow: hidden; margin-bottom: 12px; }
    .ck-row {
      display: flex; align-items: center; gap: 12px;
      width: 100%;
      padding: 14px 16px;
      border: none;
      border-bottom: 1px solid var(--line);
      background: transparent;
      cursor: pointer;
      text-align: left;
      font-family: var(--font-body);
      min-height: 44px;
    }
    .ck-row.last { border-bottom: none; }
    .ck-row[disabled] { cursor: default; opacity: 1; }
    .ck-bubble {
      width: 26px; height: 26px;
      border-radius: 50%;
      flex-shrink: 0;
      border: 1.5px solid var(--line);
      background: #FFFFFF;
      display: grid; place-items: center;
      font-size: 11px; font-weight: 700; color: var(--text-muted);
    }
    .ck-bubble.done { border: none; background: var(--success); }
    .ck-text { flex: 1; min-width: 0; }
    .ck-label { font-size: 13px; font-weight: 600; color: var(--text); }
    .ck-label.done { color: var(--text-muted); text-decoration: line-through; }
    .ck-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .empty-cta { margin-top: 12px; text-align: center; }
    .empty-cta-hint { font-size: 11px; color: var(--text-muted); margin-bottom: 8px; }

    /* ════════ Desktop portal shell ════════ */
    .pw-shell { display: flex; min-height: 100dvh; background: var(--surface); }
    app-prov-web-sidebar { position: sticky; top: 0; height: 100dvh; }
    .pw-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    app-prov-web-topbar { position: sticky; top: 0; z-index: 5; }
    .pw-content { flex: 1; padding: 0 0 40px; }

    .pw-header {
      position: relative;
      display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
      padding: 24px 28px 4px;
    }
    .pw-crumb { font-size: 0.6875rem; color: var(--text-muted); font-weight: 600; margin-bottom: 6px; }
    .pw-title { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 500; letter-spacing: 0.2px; line-height: 1.15; }
    .pw-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 6px; }
    .pw-header-text-centered { flex: 1; min-width: 0; text-align: center; }
    .pw-header-actions { position: absolute; top: 24px; right: 28px; display: flex; gap: 8px; flex-shrink: 0; }
    .pw-header-centered { justify-content: center; text-align: center; }
    .pw-header-centered .pw-header-text { max-width: 640px; }

    /* Buttons */
    .wbtn {
      height: 40px; padding: 0 16px; border-radius: 10px; cursor: pointer;
      font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.2px;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      border: 1px solid transparent; white-space: nowrap;
    }
    .wbtn.sm { height: 32px; padding: 0 12px; font-size: 0.75rem; }
    .wbtn.full { width: 100%; }
    .wbtn-secondary { background: #fff; color: var(--text); border-color: var(--line); }
    .wbtn-secondary:hover { border-color: var(--accent-blue-deep); }
    .wbtn-ink { background: var(--ink); color: #fff; border-color: var(--ink); }
    .wbtn-ink:hover { background: #1F1F22; }
    .wbtn-green { background: var(--success); color: #fff; border-color: var(--success); }
    .wbtn-ghost { background: transparent; color: var(--text); border-color: transparent; }
    .wbtn-ghost:hover { background: var(--surface-2); }

    /* Cards */
    .web-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 20px; }
    .web-card.nopad { padding: 0; overflow: hidden; }
    .card-head-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px; }
    .card-h3 { margin: 0; font-family: var(--font-display); font-size: 1.25rem; font-weight: 500; }
    .card-link { font-size: 0.75rem; color: var(--text); font-weight: 600; cursor: pointer; }

    /* KPI strip */
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px 28px; }
    .kpi { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
    .kpi-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; color: var(--text-muted); }
    .kpi-value { font-family: var(--font-display); font-size: 1.75rem; font-weight: 500; margin-top: 8px; line-height: 1; }
    .kpi-value.accent { color: var(--accent-blue-text); }
    .kpi-sub { font-size: 0.6875rem; color: var(--text-muted); margin-top: 6px; }

    /* Dashboard grid */
    .dash-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; padding: 0 28px; }
    .dash-side { display: flex; flex-direction: column; gap: 12px; }
    .cal-card { display: block; padding: 24px; }

    /* Volume */
    .vol-row { display: flex; align-items: baseline; gap: 14px; }
    .vol-total strong { font-family: var(--font-display); font-size: 2.125rem; font-weight: 500; line-height: 1; }
    .vol-total span { font-size: 0.6875rem; color: var(--text-muted); display: block; margin-top: 4px; }
    .vol-meter { flex: 1; }
    .vol-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
    .vb-new { background: var(--accent-blue-deep); }
    .vb-ret { background: var(--accent-blue); }
    .vol-legend { display: flex; justify-content: space-between; font-size: 0.6875rem; color: var(--text); }
    .vol-legend .dot { width: 8px; height: 8px; display: inline-block; border-radius: 2px; margin-right: 4px; }
    .vol-legend .dot.new { background: var(--accent-blue-deep); }
    .vol-legend .dot.ret { background: var(--accent-blue); }

    /* Today's schedule */
    .sched-card { padding: 0; margin: 16px 28px 0; overflow: hidden; }
    .sched-head { padding: 18px 22px; border-bottom: 1px solid var(--line); }
    .sched-title { margin: 0; font-family: var(--font-display); font-size: 1.375rem; font-weight: 500; }
    .sched-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
    .sched-row { padding: 16px 22px; display: flex; align-items: center; gap: 16px; border-top: 1px solid var(--surface); }
    .sched-row.first { border-top: none; }
    .sched-time { width: 56px; text-align: center; flex-shrink: 0; }
    .st-h { font-family: var(--font-display); font-size: 1.5rem; font-weight: 500; line-height: 1; }
    .st-ap { font-size: 0.625rem; font-weight: 700; letter-spacing: 0.6px; color: var(--text-muted); }
    .sched-bar { width: 4px; height: 44px; background: var(--accent-blue-deep); border-radius: 4px; flex-shrink: 0; }
    .sched-bar.pending { background: #8A6A1F; }
    .sched-info { flex: 1; min-width: 0; }
    .si-svc { font-family: var(--font-display); font-size: 1.125rem; font-weight: 500; }
    .si-meta { font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 8px; margin-top: 2px; flex-wrap: wrap; }
    .si-meta .dotsep { opacity: 0.5; }
    .si-meta .mono { font-family: var(--font-mono); }
    .si-meta .price { font-weight: 600; color: var(--text); }
    .status-chip {
      font-size: 0.625rem; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase;
      padding: 4px 9px; border-radius: 999px; background: var(--success-soft, #E5F3EA); color: var(--success); flex-shrink: 0;
    }
    .status-chip.pending { background: #FFF4DA; color: #8A6A1F; }
    .sched-empty { padding: 28px 22px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }

    /* Empty state */
    .checklist-head { padding: 18px 22px; border-bottom: 1px solid var(--line); }
    .ck-row {
      display: flex; align-items: center; gap: 16px; width: 100%;
      padding: 18px 22px; border: none; border-top: 1px solid var(--surface);
      background: transparent; cursor: pointer; text-align: left; font-family: var(--font-body);
    }
    .ck-row:first-of-type { border-top: none; }
    .ck-row[disabled] { cursor: default; }
    .ck-bubble {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      border: 1.5px dashed var(--line); background: #fff;
      display: grid; place-items: center; font-family: var(--font-mono); font-size: 0.8125rem; font-weight: 700; color: var(--text-muted);
    }
    .ck-bubble.done { border: none; background: var(--success); color: #fff; }
    .ck-text { flex: 1; min-width: 0; }
    .ck-label { font-family: var(--font-display); font-size: 1.25rem; font-weight: 500; }
    .ck-label.done { color: var(--text-muted); text-decoration: line-through; }
    .ck-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 4px; }

    .preview-card { display: flex; flex-direction: column; }
    .preview-sub { font-size: 0.75rem; color: var(--text-muted); margin: 4px 0 16px; }
    .preview-frame {
      aspect-ratio: 4 / 3; border-radius: 12px; border: 1px solid var(--line);
      background: repeating-linear-gradient(135deg, #E9E9EB 0, #E9E9EB 8px, #F2F2F2 8px, #F2F2F2 16px);
      display: grid; place-items: center; text-align: center; margin-bottom: 16px;
    }
    .preview-name { font-family: var(--font-display); font-size: 1.375rem; }
    .preview-hint { font-family: var(--font-mono); font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px; }

    /* Responsive: collapse multi-col grids under ~960px */
    @media screen and (max-width: 960px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .dash-grid { grid-template-columns: 1fr; }
    }
    @media screen and (max-width: 720px) {
      app-prov-web-sidebar { display: none; }
      .pw-header { flex-direction: column; padding: 16px; }
      .kpi-grid { padding: 12px 16px; }
      .dash-grid { padding: 0 16px; }
      .sched-card { margin: 16px 16px 0; }
    }
  `],
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
    earnings_dollars: '0.00', earnings_target_dollars: '5000.00',
    bookings_count: 0, by_category: {}, new_clients: 0, recurring_clients: 0,
  };
  loggingOut = false;

  arcPath = '';
  arcDash = '0 220';
  dotX = 6;
  dotY = 76;
  earningsPct = 0;

  // Currently displayed month (for calendar prev/next nav).
  private curYear = 0;
  private curMonthIdx = 0;
  private todayStr = '';
  private todaySchedule: BookingItem[] = [];

  constructor(private auth: BeautyAuthService, private http: HttpClient) {}

  get business(): { email?: string; business_name?: string } | null {
    return (this.data['business'] as { email?: string; business_name?: string }) || null;
  }

  get businessInitial(): string {
    const n = this.business?.business_name || '';
    return n.trim()[0]?.toUpperCase() || '·';
  }

  get topBadge(): number | null {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    const total = (b.messages_unread || 0) + (b.bookings_unread || 0);
    return total > 0 ? total : null;
  }

  get tabBadges(): { bookings?: number; messages?: number } {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  get storefrontOpen(): boolean {
    const sf = (this.data['storefront'] as { is_open?: boolean }) || {};
    return sf.is_open !== false;
  }

  get earningsDollars(): string {
    return this.stats.earnings_dollars
      || (((this.stats.earnings_cents || 0) / 100).toFixed(2));
  }

  get targetDollars(): string {
    const v = this.stats.earnings_target_dollars
      || ((this.stats.earnings_target_cents || 0) / 100).toFixed(2);
    const num = parseFloat(v);
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  get showEmpty(): boolean {
    const hasServices = !!(this.data['has_services'] ?? !!this.links['add-service']);
    const stats = this.stats || {};
    const noActivity = !stats.bookings_count && !stats.earnings_cents;
    return noActivity && !hasServices && !!this.business;
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

    this.curYear = y;
    this.curMonthIdx = m;
    this.todayStr = today;
    // Cache today's schedule from the initial (current-month) payload so it
    // survives month navigation, which overwrites monthBookings.
    this.todaySchedule = (this.monthBookings[today] || [])
      .slice().sort((a, b) => a.slot_at.localeCompare(b.slot_at));
    this.weeks = this.buildMonthGrid(y, m, today);
    if (!this.focusedDate) this.focusedDate = today;
    this.recalcArc();
  }

  private buildMonthGrid(year: number, monthIdx: number, today: string): DayCell[][] {
    const firstOfMonth = new Date(Date.UTC(year, monthIdx, 1));
    const lastOfMonth = new Date(Date.UTC(year, monthIdx + 1, 0));
    const startDay = firstOfMonth.getUTCDay();
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

  private recalcArc(): void {
    const ratio = Math.max(0, Math.min(1,
      (this.stats.earnings_cents || 0) / Math.max(1, this.stats.earnings_target_cents)
    ));
    this.earningsPct = Math.round(ratio * 100);
    // Arc on viewBox 152 wide, semicircle from (6,76) → (146,76), r=70.
    const r = 70;
    const cx = 76, cy = 76;
    const semiLen = Math.PI * r;
    this.arcDash = `${(ratio * semiLen).toFixed(2)} ${semiLen.toFixed(2)}`;
    this.arcPath = `M 6 76 A ${r} ${r} 0 0 1 146 76`;
    const theta = Math.PI * (1 - ratio);
    this.dotX = +(cx + r * Math.cos(theta)).toFixed(2);
    this.dotY = +(cy - r * Math.sin(theta)).toFixed(2);
  }

  cellAriaLabel(cell: DayCell): string {
    if (!cell.inMonth) return '';
    const tag = cell.isToday ? ' (today)' : '';
    return cell.count > 0
      ? `${cell.date}${tag}, ${cell.count} bookings`
      : `${cell.date}${tag}, no bookings`;
  }

  selectDay(date: string): void {
    this.selectedDate = this.selectedDate === date ? null : date;
  }

  onCalendarKeydown(e: KeyboardEvent): void {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key === 'Enter' || e.key === ' ') {
      if (this.focusedDate) { this.selectDay(this.focusedDate); e.preventDefault(); }
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

  navigateMonth(delta: number): void {
    let y = this.curYear || new Date().getUTCFullYear();
    let m = (this.curMonthIdx || new Date().getUTCMonth()) + delta;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    const url = `${environment.apiBaseUrl}/api/beauty/protected/business/calendar/`
      + `?year=${y}&month=${m + 1}`;
    this.http.get<{
      month: string; today: string;
      month_bookings: Record<string, BookingItem[]>; stats: DashboardStats;
    }>(url, { withCredentials: true, headers: this.auth.getAuthHeaders() }).subscribe({
      next: (resp) => {
        this.curYear = y;
        this.curMonthIdx = m;
        this.monthBookings = resp.month_bookings || {};
        this.stats = resp.stats || this.stats;
        this.todayStr = resp.today || this.todayStr;
        this.monthLabel = new Date(Date.UTC(y, m, 1)).toLocaleDateString(undefined, {
          month: 'long', year: 'numeric', timeZone: 'UTC',
        });
        this.selectedDate = null;
        this.weeks = this.buildMonthGrid(y, m, this.todayStr);
        this.recalcArc();
      },
      error: () => { /* keep current month on failure */ },
    });
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

  onBell(): void { /* future: notifications panel */ }

  get greeting(): string {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }

  get todayLabel(): string {
    const today = (this.data['today'] as string) || '';
    try {
      const d = today ? new Date(today + 'T00:00:00Z') : new Date();
      return d.toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric',
        ...(today ? { timeZone: 'UTC' } : {}),
      });
    } catch { return today; }
  }

  get todayBookings(): BookingItem[] {
    return this.todaySchedule;
  }

  get conversionPct(): number { return Number(this.stats.conversion_pct || 0); }
  get reviewCount(): number { return Number(this.stats.review_count || 0); }
  get ratingLabel(): string {
    return this.stats.rating != null ? `${this.stats.rating.toFixed(2)}★` : '—';
  }

  get navBadges(): Partial<Record<ProvWebNav, number>> {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  formatTimeH(iso: string): string {
    try { return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, ''); }
    catch { return ''; }
  }
  formatTimeAP(iso: string): string {
    try { const m = new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric' }).match(/[AP]M/i); return m ? m[0].toUpperCase() : ''; }
    catch { return ''; }
  }
  priceOf(b: BookingItem): string {
    if (b.price_dollars) return `$${b.price_dollars}`;
    return `$${((b.price_cents || 0) / 100).toFixed(0)}`;
  }
  isPending(status: string): boolean { return status === 'pending' || status === 'requested'; }
  statusLabel(status: string): string { return this.isPending(status) ? 'Pending' : 'Confirmed'; }

  resolveAvailability() {
    return this.links['availability'] || {
      rel: 'availability', href: null, method: 'NAV',
      screen: 'beauty_business_availability',
      route: '/business/availability',
      prompt: 'Hours',
    };
  }

  goToReviews(): void {
    // "View storefront / Payouts / Preview" now open the desktop Profile
    // (storefront identity + earnings + reviews) instead of the retired
    // phone-frame reviews screen.
    this.emit({
      rel: 'profile', href: null, method: 'NAV',
      screen: 'beauty_business_profile', route: '/business/profile', prompt: 'Profile',
    });
  }

  messageCustomer(b: BookingItem): void {
    this.followLink.emit({
      rel: 'message', href: null, method: 'NAV',
      screen: 'beauty_business_messages', route: `/business/messages/${b.id}`,
      params: { bookingId: b.id }, prompt: 'Message',
    });
  }

  get servicesCount(): number {
    return Number((this.data['services_count'] as number) || 0);
  }

  get hoursLabel(): string {
    return (this.data['hours_label'] as string) || 'Set weekly hours';
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
