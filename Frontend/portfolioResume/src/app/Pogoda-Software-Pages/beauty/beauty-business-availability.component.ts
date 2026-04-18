/**
 * BeautyBusinessAvailabilityComponent (Presentational)
 * ----------------------------------------------------
 * Weekly business-hours editor. The BFF supplies 7 rows (Mon..Sun);
 * the user toggles "closed" or edits start/end times and clicks Save,
 * which PUTs the full set of 7 rows back to the server.
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

interface DayRow {
  day_of_week: number;
  day_label: string;
  start_time: string;
  end_time: string;
  is_closed: boolean;
  is_24h: boolean;
}

@Component({
  selector: 'app-beauty-business-availability',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="biz-app">
      <header class="biz-header">
        <button class="back-btn" (click)="emit(links['business_home'])" *ngIf="links['business_home']">
          ← Dashboard
        </button>
        <h1 class="biz-h1">Weekly hours</h1>
        <button class="btn-primary" (click)="save()" [disabled]="isSaving">
          {{ isSaving ? 'Saving…' : 'Save' }}
        </button>
      </header>

      <section class="biz-section">
        <p class="hint">Set when your storefront is open each day. Customers can only book during these hours.</p>

        <ul class="day-list">
          <li *ngFor="let row of rows" class="day-row" [class.closed]="row.is_closed">
            <span class="day-name">{{ row.day_label }}</span>
            <label class="closed-toggle">
              <input
                type="checkbox"
                [(ngModel)]="row.is_closed"
                (ngModelChange)="onClosedChange(row)"
              />
              Closed
            </label>
            <label class="closed-toggle">
              <input
                type="checkbox"
                [(ngModel)]="row.is_24h"
                [disabled]="row.is_closed"
                (ngModelChange)="onTwentyFourChange(row)"
              />
              Open 24h
            </label>
            <input
              type="time"
              class="time-input"
              [(ngModel)]="row.start_time"
              [disabled]="row.is_closed || row.is_24h"
            />
            <span class="dash">–</span>
            <input
              type="time"
              class="time-input"
              [(ngModel)]="row.end_time"
              [disabled]="row.is_closed || row.is_24h"
            />
          </li>
        </ul>

        <p *ngIf="message" class="msg" [class.error]="isError">{{ message }}</p>
      </section>
    </div>
  `,
  styles: [`
    .biz-app { min-height: 100dvh; background: #fafafa; font-family: -apple-system, sans-serif; color: #212121; }
    .biz-header { display: flex; align-items: center; gap: 16px; padding: 16px 24px; background: #fff; border-bottom: 1px solid #eee; }
    .back-btn { background: none; border: none; color: #555; cursor: pointer; }
    .biz-h1 { font-size: 1.2rem; margin: 0; flex: 1; }
    .btn-primary { background: #1d4ed8; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn-primary:disabled { background: #aaa; cursor: not-allowed; }
    .biz-section { padding: 24px; max-width: 720px; margin: 0 auto; }
    .hint { color: #666; margin: 0 0 16px; }
    .day-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .day-row { background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; gap: 16px; }
    .day-row.closed .time-input { opacity: 0.4; }
    .day-name { font-weight: 600; min-width: 100px; }
    .closed-toggle { display: flex; align-items: center; gap: 6px; color: #666; }
    .time-input { padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 0.95rem; }
    .dash { color: #999; }
    .msg { padding: 12px 0; color: #1d4ed8; }
    .msg.error { color: #c62828; }
  `],
})
export class BeautyBusinessAvailabilityComponent implements OnChanges {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  rows: DayRow[] = [];
  isSaving = false;
  message = '';
  isError = false;

  constructor(private authService: BeautyAuthService) {}

  ngOnChanges(_: SimpleChanges): void {
    const incoming = (this.data['weekly_hours'] as DayRow[]) || [];
    // Clone so two-way binding doesn't mutate parent state. Tolerate
    // legacy rows that don't yet carry an is_24h field.
    this.rows = incoming.map((r) => ({ ...r, is_24h: !!r.is_24h }));
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  onClosedChange(row: DayRow): void {
    if (row.is_closed) row.is_24h = false;
  }

  onTwentyFourChange(row: DayRow): void {
    if (row.is_24h) row.is_closed = false;
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
      screen: null,
      route: null,
      prompt: null,
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
