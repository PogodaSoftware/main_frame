/**
 * BeautyBusinessAvailabilityComponent — redesigned per Business Provider Portal handoff (hours-1).
 * Quick-set chips + per-day Closed/Open/24h segmented pill + time inputs + tz info banner.
 */

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyProviderSubHeaderComponent } from './provider/prov-sub-header.component';
import { BeautyProviderTabBarComponent, ProviderTab } from './provider/prov-tab-bar.component';
import { resolveTabLink } from './provider/prov-tab-nav';
import { BeautyProviderCardComponent } from './provider/prov-card.component';
import { BeautyProviderButtonComponent } from './provider/prov-btn.component';

interface DayRow {
  day_of_week: number;
  day_label: string;
  start_time: string;
  end_time: string;
  is_closed: boolean;
  is_24h: boolean;
}

type SegState = 'closed' | 'open' | '24h';

interface QuickSet {
  k: string;
  label: string;
  apply: (rows: DayRow[]) => void;
}

const QUICK_SETS: QuickSet[] = [
  { k: 'wd-10-6', label: 'Weekdays 10–6', apply: (rows) => setMon(rows, 1, 5, '10:00', '18:00') },
  { k: 'mf-9-5', label: 'Mon–Fri 9–5', apply: (rows) => setMon(rows, 1, 5, '09:00', '17:00') },
  { k: '7day', label: '7 days 10–8', apply: (rows) => setMon(rows, 0, 6, '10:00', '20:00') },
  { k: 'wknd', label: 'Weekends only', apply: (rows) => {
    rows.forEach(r => { r.is_closed = true; r.is_24h = false; });
    rows.filter(r => r.day_of_week === 0 || r.day_of_week === 6).forEach(r => {
      r.is_closed = false; r.start_time = '10:00'; r.end_time = '18:00';
    });
  }},
  { k: 'closed', label: 'Closed all week', apply: (rows) => {
    rows.forEach(r => { r.is_closed = true; r.is_24h = false; });
  }},
];

function setMon(rows: DayRow[], from: number, to: number, start: string, end: string) {
  rows.forEach(r => {
    if (r.day_of_week >= from && r.day_of_week <= to) {
      r.is_closed = false; r.is_24h = false;
      r.start_time = start; r.end_time = end;
    } else {
      r.is_closed = true; r.is_24h = false;
    }
  });
}

@Component({
  selector: 'app-beauty-business-availability',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BeautyProviderSubHeaderComponent,
    BeautyProviderTabBarComponent,
    BeautyProviderCardComponent,
    BeautyProviderButtonComponent,
  ],
  template: `
    <div class="beauty-app prov-shell">
      <app-prov-sub-header back="Dashboard" title="Weekly hours"
                           (backClick)="emit(links['business_home'])">
        <app-prov-btn slot="right" variant="primary" size="sm"
                      (clicked)="save()" [disabled]="isSaving">
          {{ isSaving ? 'Saving…' : 'Save' }}
        </app-prov-btn>
      </app-prov-sub-header>

      <main id="main" class="prov-body">
        <p class="hint">Set when your storefront is open. Customers can only book during these hours.</p>

        <div class="quickset">
          <div class="qs-label">Quick set</div>
          <div class="qs-chips">
            <button *ngFor="let qs of quickSets" type="button"
                    class="qs-chip" [class.is-selected]="activeQuickSet === qs.k"
                    (click)="applyQuickSet(qs)">
              {{ qs.label }}
            </button>
          </div>
        </div>

        <app-prov-card padding="0 14px" class="hours-card">
          <div *ngFor="let row of rows; let last = last" class="day-row" [class.last]="last">
            <div class="day-col">
              <div class="day-name">{{ row.day_label }}</div>
              <div class="day-sub">{{ subLabel(row) }}</div>
            </div>

            <div class="seg-pill">
              <button type="button" class="seg" [class.is-selected]="state(row) === 'closed'"
                      [class.closed]="state(row) === 'closed'"
                      (click)="setState(row, 'closed')">Closed</button>
              <button type="button" class="seg" [class.is-selected]="state(row) === 'open'"
                      (click)="setState(row, 'open')">Open</button>
              <button type="button" class="seg" [class.is-selected]="state(row) === '24h'"
                      (click)="setState(row, '24h')">24h</button>
            </div>

            <div class="time-pair" *ngIf="state(row) === 'open'">
              <input type="time" [(ngModel)]="row.start_time"
                     class="time-input"
                     [attr.aria-label]="row.day_label + ' start time'"/>
              <span class="dash" aria-hidden="true">–</span>
              <input type="time" [(ngModel)]="row.end_time"
                     class="time-input"
                     [attr.aria-label]="row.day_label + ' end time'"/>
            </div>
          </div>
        </app-prov-card>

        <div class="tz-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17v.01"/>
          </svg>
          <span>Time zone: UTC. All bookings show in your customer's local time.</span>
        </div>

        <p *ngIf="message" class="msg" [class.error]="isError"
           [attr.role]="isError ? 'alert' : 'status'" aria-live="polite">{{ message }}</p>
      </main>

      <app-prov-tab-bar active="dashboard" [badges]="tabBadges" (tabClick)="onTab($event)"></app-prov-tab-bar>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --danger: #C0392B;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
      background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .prov-shell {
      display: flex; flex-direction: column;
      min-height: 100vh;
      background: var(--surface); color: var(--text);
      font-family: var(--font-body);
    }
    .prov-body { flex: 1; padding: 14px 16px; overflow-y: auto; }
    .hint {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
      margin: 0 0 12px;
    }

    .quickset { margin-bottom: 14px; }
    .qs-label {
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.6px; text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .qs-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .qs-chip {
      padding: 7px 12px; min-height: 44px;
      border-radius: 999px;
      font-size: 12px; font-weight: 600;
      cursor: pointer;
      background: #FFFFFF;
      color: var(--text);
      border: 1px solid var(--line);
    }
    .qs-chip.is-selected {
      background: var(--text); color: #FFFFFF;
      border-color: var(--text);
    }

    .hours-card { display: block; }
    .day-row {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 0;
      border-bottom: 1px solid var(--line);
      flex-wrap: wrap;
    }
    .day-row.last { border-bottom: none; }
    .day-col { width: 80px; flex-shrink: 0; }
    .day-name { font-size: 13px; font-weight: 600; color: var(--text); }
    .day-sub { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

    .seg-pill {
      display: inline-flex;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 2px;
    }
    .seg {
      padding: 6px 10px; min-height: 32px;
      border-radius: 999px;
      font-size: 11px; font-weight: 600;
      background: transparent;
      color: var(--text-muted);
      border: 1px solid transparent;
      cursor: pointer;
      white-space: nowrap;
    }
    .seg.is-selected {
      background: #FFFFFF;
      color: var(--text);
      border-color: var(--line);
    }
    .seg.is-selected.closed {
      background: #FCE8E5;
      color: var(--danger);
      border-color: rgba(192,57,43,0.33);
    }

    .time-pair {
      display: flex; align-items: center; gap: 4px;
      margin-left: auto;
    }
    .time-input {
      font-family: var(--font-mono);
      font-size: 11px; font-weight: 600;
      color: var(--text);
      background: #FFFFFF;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 5px 8px;
      min-height: 32px;
    }
    .dash { color: var(--text-muted); font-size: 11px; }

    .tz-banner {
      margin-top: 12px;
      font-size: 11px;
      color: #1a3a52;
      background: rgba(207,227,245,0.6);
      border: 1px solid rgba(125,168,207,0.33);
      border-radius: 10px;
      padding: 10px 12px;
      display: flex; gap: 8px; align-items: flex-start;
    }
    .tz-banner svg { color: var(--accent-blue-deep); flex-shrink: 0; margin-top: 1px; }

    .msg {
      padding: 12px 0;
      color: var(--accent-blue-deep);
      font-size: 13px;
    }
    .msg.error { color: var(--danger); }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
  `],
})
export class BeautyBusinessAvailabilityComponent implements OnChanges {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  rows: DayRow[] = [];
  quickSets = QUICK_SETS;
  activeQuickSet: string | null = null;
  isSaving = false;
  message = '';
  isError = false;

  constructor(private authService: BeautyAuthService) {}

  ngOnChanges(_: SimpleChanges): void {
    const incoming = (this.data['weekly_hours'] as DayRow[]) || [];
    this.rows = incoming.map((r) => ({ ...r, is_24h: !!r.is_24h }));
    this.activeQuickSet = null;
  }

  get tabBadges(): { bookings?: number; messages?: number } {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  state(row: DayRow): SegState {
    if (row.is_closed) return 'closed';
    if (row.is_24h) return '24h';
    return 'open';
  }

  setState(row: DayRow, st: SegState): void {
    row.is_closed = st === 'closed';
    row.is_24h = st === '24h';
    if (st === 'open' && !row.start_time) row.start_time = '10:00';
    if (st === 'open' && !row.end_time) row.end_time = '18:00';
    this.activeQuickSet = null;
  }

  subLabel(row: DayRow): string {
    if (row.is_closed) return 'Closed';
    if (row.is_24h) return 'Open 24h';
    const a = (row.start_time || '').slice(0, 5);
    const b = (row.end_time || '').slice(0, 5);
    return `${a}–${b}`;
  }

  applyQuickSet(qs: QuickSet): void {
    qs.apply(this.rows);
    this.activeQuickSet = qs.k;
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  onTab(tab: ProviderTab): void {
    this.emit(resolveTabLink(tab, this.links));
  }

  save(): void {
    if (this.isSaving) return;
    this.isSaving = true;
    this.message = '';
    this.isError = false;

    const submitLink: BffLink = {
      rel: 'submit',
      href: (this.data['submit_href'] as string) || '/api/beauty/protected/business/availability/',
      method: ((this.data['submit_method'] as string) || 'PUT') as BffLink['method'],
      screen: null, route: null, prompt: null,
    };

    this.authService.follow(submitLink, { weekly_hours: this.rows }).subscribe({
      next: () => {
        this.isSaving = false;
        this.message = 'Saved.';
        const self = this.links['self'];
        if (self) this.followLink.emit(self);
      },
      error: (err) => {
        this.isSaving = false;
        this.isError = true;
        this.message = err?.error?.detail || 'Could not save. Please check the times.';
      },
    });
  }
}
