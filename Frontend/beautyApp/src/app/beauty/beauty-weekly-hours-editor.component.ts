/**
 * BeautyWeeklyHoursEditorComponent — shared weekly-hours editor.
 * Used by both the business onboarding wizard (schedule step) and the
 * post-acceptance availability page so the two screens stay in sync.
 *
 * Rows are mutated in place; consumers read `this.rows` after edit.
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


export interface DayRow {
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

// Backend uses Python weekday() ordering: Mon=0, Tue=1, …, Sat=5, Sun=6.
const QUICK_SETS: QuickSet[] = [
  { k: 'wd-10-6', label: 'Weekdays 10–6', apply: (rows) => setMon(rows, 0, 4, '10:00', '18:00') },
  { k: 'mf-9-5', label: 'Mon–Fri 9–5', apply: (rows) => setMon(rows, 0, 4, '09:00', '17:00') },
  { k: '7day', label: '7 days 10–8', apply: (rows) => setMon(rows, 0, 6, '10:00', '20:00') },
  { k: 'wknd', label: 'Weekends only', apply: (rows) => {
    rows.forEach(r => { r.is_closed = true; r.is_24h = false; });
    rows.filter(r => r.day_of_week === 5 || r.day_of_week === 6).forEach(r => {
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
  selector: 'app-beauty-weekly-hours-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wh-editor" [class.is-flat]="flat">
    <div class="quickset" [class.flat]="flat">
      <div class="qs-label">Quick set</div>
      <div class="qs-chips">
        <button *ngFor="let qs of quickSets" type="button"
                class="qs-chip" [class.is-selected]="activeQuickSet === qs.k"
                (click)="applyQuickSet(qs)">
          {{ qs.label }}
        </button>
      </div>
    </div>

    <div class="sched-label" *ngIf="flat">Schedule</div>

    <div class="hours-card" [class.boxed]="!flat">
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
                 [name]="'start-' + row.day_of_week"
                 [attr.aria-label]="row.day_label + ' start time'"/>
          <span class="dash" aria-hidden="true">–</span>
          <input type="time" [(ngModel)]="row.end_time"
                 class="time-input"
                 [name]="'end-' + row.day_of_week"
                 [attr.aria-label]="row.day_label + ' end time'"/>
        </div>
      </div>
    </div>

    <div class="tz-banner" *ngIf="!hideTzBanner">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17v.01"/>
      </svg>
      <span>Time zone: UTC. All bookings show in your customer's local time.</span>
    </div>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --danger: #C0392B;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .quickset { margin-top: 20px; margin-bottom: 14px; }
    .quickset.flat { margin-top: 0; }
    .qs-label, .sched-label {
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.6px; text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .sched-label { margin-top: 18px; }
    .qs-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .qs-chip {
      padding: 7px 12px; min-height: 44px;
      border-radius: 999px;
      font-size: 12px; font-weight: 600;
      cursor: pointer;
      background: #FFFFFF;
      color: var(--text);
      border: 1px solid var(--line);
      font-family: var(--font-body);
    }
    .qs-chip.is-selected {
      background: var(--text); color: #FFFFFF;
      border-color: var(--text);
    }

    .hours-card { display: block; }
    .hours-card.boxed { background: #FFFFFF; border: 1px solid var(--line); border-radius: 14px; padding: 0 14px; }
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
      font-family: var(--font-body);
    }
    .seg.is-selected {
      background: var(--text);
      color: #FFFFFF;
      border-color: var(--text);
    }
    /* Closed selected uses the same ink fill as Open per the desktop design. */
    .seg.is-selected.closed {
      background: var(--text);
      color: #FFFFFF;
      border-color: var(--text);
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

    /* --- Web (flat) overrides: square pills, bigger text, tighter spacing --- */
    .is-flat .qs-label, .is-flat .sched-label { font-size: 12px; }
    .is-flat .qs-chip { font-size: 13px; padding: 10px 14px; }
    .is-flat .day-row { padding: 16px 0; gap: 18px; }
    .is-flat .day-col { width: 96px; }
    .is-flat .day-name { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.375rem; font-weight: 500; }
    .is-flat .day-sub { font-size: 12px; margin-top: 1px; }
    .is-flat .seg-pill { border-radius: 10px; padding: 3px; gap: 2px; }
    .is-flat .seg { border-radius: 7px; font-size: 13px; padding: 9px 18px; min-height: 38px; }
    .is-flat .time-pair { margin-left: 22px; gap: 8px; }
    .is-flat .time-input { font-size: 14px; padding: 8px 10px; min-height: 38px; }
    .is-flat .dash { font-size: 14px; }
  `],
})
export class BeautyWeeklyHoursEditorComponent {
  @Input() rows: DayRow[] = [];
  /** Web/desktop: drop the inner card wrapper (parent supplies one card) + show a "Schedule" eyebrow. */
  @Input() flat = false;
  /** Web/desktop: hide the inline TZ banner (the page shows a TZ rail card instead). */
  @Input() hideTzBanner = false;

  quickSets = QUICK_SETS;
  activeQuickSet: string | null = null;

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
}
