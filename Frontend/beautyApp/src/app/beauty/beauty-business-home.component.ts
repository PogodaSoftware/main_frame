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

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyProviderTopHeaderComponent } from './provider/prov-top-header.component';
import { BeautyProviderTabBarComponent, ProviderTab } from './provider/prov-tab-bar.component';
import { resolveTabLink } from './provider/prov-tab-nav';
import { BeautyProviderCardComponent } from './provider/prov-card.component';
import { BeautyProviderButtonComponent } from './provider/prov-btn.component';

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
}

@Component({
  selector: 'app-beauty-business-home',
  standalone: true,
  imports: [
    CommonModule,
    BeautyProviderTopHeaderComponent,
    BeautyProviderTabBarComponent,
    BeautyProviderCardComponent,
    BeautyProviderButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="beauty-app prov-shell">
      <app-prov-top-header [badge]="topBadge" (bellClick)="onBell()"></app-prov-top-header>

      <main id="main" class="prov-body" *ngIf="!showEmpty">
        <!-- Greeting row -->
        <div class="greet-row">
          <div class="avatar" aria-hidden="true">{{ businessInitial }}</div>
          <div class="greet-text">
            <div class="biz-name">{{ business?.business_name || 'Your storefront' }}</div>
            <div class="biz-email">{{ business?.email || '' }}</div>
          </div>
          <button type="button" class="status-pill" (click)="emit(links['availability'])"
                  [attr.aria-label]="storefrontOpen ? 'Storefront open' : 'Storefront closed'">
            <span class="status-dot" [class.is-closed]="!storefrontOpen" aria-hidden="true"></span>
            <span>{{ storefrontOpen ? 'Open' : 'Closed' }}</span>
          </button>
        </div>

        <!-- Calendar card -->
        <app-prov-card [padding]="16" class="cal-card">
          <div class="cal-head">
            <h2 class="cal-month">{{ monthLabel }}</h2>
            <div class="cal-nav">
              <button type="button" class="cal-nav-btn" (click)="navigateMonth(-1)" aria-label="Previous month">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <button type="button" class="cal-nav-btn" (click)="navigateMonth(1)" aria-label="Next month">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M9 6l6 6-6 6"/>
                </svg>
              </button>
            </div>
          </div>

          <div role="grid" class="cal-grid"
               [attr.aria-label]="'Bookings for ' + monthLabel"
               (keydown)="onCalendarKeydown($event)">
            <div role="row" class="cal-dow">
              <span role="columnheader" *ngFor="let d of daysOfWeek">{{ d }}</span>
            </div>
            <div role="row" *ngFor="let week of weeks" class="cal-row">
              <button
                *ngFor="let cell of week"
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
                <span *ngIf="cell.count > 0" class="cal-pip" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <div *ngIf="selectedDate && (monthBookings[selectedDate] || []).length"
               class="day-bookings" [attr.aria-label]="'Bookings on ' + selectedDate">
            <div class="day-head">{{ selectedDate }}</div>
            <ul>
              <li *ngFor="let b of monthBookings[selectedDate]" class="day-booking">
                <strong>{{ formatTime(b.slot_at) }}</strong>
                <span class="svc">{{ b.service_name }}</span>
                <span class="cust">{{ b.customer_email }}</span>
              </li>
            </ul>
          </div>
        </app-prov-card>

        <!-- Quick action tiles -->
        <div class="qa-row">
          <button type="button" class="qa-tile primary"
                  (click)="emit(resolveTab('services'))">
            <span class="qa-icon-wrap primary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z"/>
                <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>
              </svg>
            </span>
            <span class="qa-text">
              <span class="qa-label">Services</span>
              <span class="qa-sub">{{ servicesCount ? (servicesCount + ' active · tap to add') : 'Add your first' }}</span>
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
          <button type="button" class="qa-tile"
                  (click)="emit(resolveAvailability())">
            <span class="qa-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 7v5l3 2"/>
              </svg>
            </span>
            <span class="qa-text">
              <span class="qa-label">Hours</span>
              <span class="qa-sub">{{ hoursLabel }}</span>
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        <!-- Earnings + Volume -->
        <div class="stats-row">
          <app-prov-card [padding]="14" class="earn-card">
            <div class="card-eyebrow">Earnings</div>
            <div class="card-month">{{ monthLabel }}</div>
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
          </app-prov-card>

          <app-prov-card [padding]="14" class="vol-card">
            <div class="card-eyebrow">Bookings volume</div>
            <div class="vol-total">
              <strong>{{ stats.bookings_count }}</strong>
              <span>this month</span>
            </div>
            <div class="vol-grid">
              <div class="vol-cell">
                <div class="vol-num">{{ stats.new_clients }}</div>
                <div class="vol-label">New</div>
              </div>
              <div class="vol-cell">
                <div class="vol-num">{{ stats.recurring_clients }}</div>
                <div class="vol-label">Recurring</div>
              </div>
            </div>
          </app-prov-card>
        </div>
      </main>

      <!-- Empty state -->
      <main id="main" class="prov-body" *ngIf="showEmpty">
        <div class="empty-greet">
          <div class="empty-title">Welcome{{ businessInitial ? ', ' + (business?.business_name || '') : '' }}.</div>
          <div class="empty-sub">Get your storefront live in 3 quick steps.</div>
        </div>

        <app-prov-card [padding]="0" class="checklist-card">
          <button type="button" class="ck-row done" disabled>
            <span class="ck-bubble done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4L19 7"/></svg></span>
            <div class="ck-text">
              <div class="ck-label done">Create your account</div>
              <div class="ck-sub">{{ business?.email || '' }}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button type="button" class="ck-row" (click)="emit(links['services'])" [disabled]="!links['services']">
            <span class="ck-bubble">2</span>
            <div class="ck-text">
              <div class="ck-label">Add your first service</div>
              <div class="ck-sub">Massage, facial, wax — set price &amp; duration</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button type="button" class="ck-row last" (click)="emit(links['availability'])" [disabled]="!links['availability']">
            <span class="ck-bubble">3</span>
            <div class="ck-text">
              <div class="ck-label">Set weekly hours</div>
              <div class="ck-sub">When can customers book?</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </app-prov-card>

        <div class="empty-cta">
          <div class="empty-cta-hint">Customers will see your storefront once you add a service &amp; set hours.</div>
          <app-prov-btn variant="primary" [full]="true" (clicked)="emit(links['services'])">
            + Add your first service
          </app-prov-btn>
        </div>
      </main>

      <app-prov-tab-bar
        active="dashboard"
        [badges]="tabBadges"
        (tabClick)="onTab($event)">
      </app-prov-tab-bar>
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
    .qa-row { display: flex; gap: 10px; margin-bottom: 10px; }
    .qa-tile {
      flex: 1;
      display: flex; align-items: center; gap: 12px;
      padding: 14px;
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
      width: 42px; height: 42px;
      flex-shrink: 0;
      border-radius: 12px;
      background: var(--accent-blue);
      color: #1a3a52;
      display: grid; place-items: center;
    }
    .qa-icon-wrap.primary {
      background: rgba(255,255,255,0.12);
      color: #FFFFFF;
    }
    .qa-text { flex: 1; min-width: 0; display: block; }
    .qa-label {
      display: block;
      font-size: 15px; font-weight: 600;
      line-height: 1.15;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .qa-sub {
      display: block;
      font-size: 11px; margin-top: 3px;
      color: var(--text-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .qa-tile.primary .qa-sub { color: rgba(255,255,255,0.7); }
    .qa-tile.primary > svg:last-child { color: rgba(255,255,255,0.7); }
    .qa-tile > svg:last-child { color: var(--text-muted); flex-shrink: 0; }

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
    .arc-wrap { position: relative; margin-top: 8px; }
    .arc { display: block; width: 100%; height: auto; }
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
      font-family: var(--font-display);
      font-size: 22px; font-weight: 500;
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
      font-family: var(--font-display);
      font-size: 32px; font-weight: 500;
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
      font-family: var(--font-display);
      font-size: 22px; font-weight: 500;
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

    /* 430px desktop wrapper */
    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
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

  constructor(private auth: BeautyAuthService) {}

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

  navigateMonth(_delta: number): void {
    // Month navigation requires re-resolving the BFF with year/month params.
    // For now this is a no-op; wire to BFF link on next pass.
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

  onTab(tab: ProviderTab): void {
    this.emit(resolveTabLink(tab, this.links, 'business_home'));
  }

  resolveTab(tab: ProviderTab) {
    return resolveTabLink(tab, this.links, 'business_home');
  }

  resolveAvailability() {
    return this.links['availability'] || {
      rel: 'availability', href: null, method: 'NAV',
      screen: 'beauty_business_availability',
      route: '/business/availability',
      prompt: 'Hours',
    };
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
