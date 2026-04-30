/**
 * BeautyBusinessBookingsComponent (Presentational)
 * ------------------------------------------------
 * Read-only list of bookings on the signed-in provider's storefront,
 * separated into Upcoming and Past.
 */

import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from './beauty-bff.types';

interface BookingRow {
  id: number;
  status: string;
  slot_at: string;
  slot_label: string;
  service: { id: number; name: string; duration_minutes: number; price_cents: number };
  customer_email: string;
}

@Component({
  selector: 'app-beauty-business-bookings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="biz-app">
      <header class="biz-header">
        <button class="back-btn" (click)="emit(links['business_home'])" *ngIf="links['business_home']">
          ← Dashboard
        </button>
        <h1 class="biz-h1">Incoming bookings</h1>
      </header>

      <main id="main" class="biz-section">
        <h2 class="group-h">Upcoming</h2>
        <ul class="bk-list">
          <li *ngFor="let b of upcoming" class="bk-row">
            <div class="bk-info">
              <strong>{{ b.service.name }}</strong>
              <span class="bk-meta">{{ b.slot_label }} · {{ b.service.duration_minutes }} min</span>
              <span class="bk-cust">Customer: {{ b.customer_email }}</span>
            </div>
            <span class="bk-price">\${{ (b.service.price_cents / 100).toFixed(2) }}</span>
          </li>
          <li *ngIf="!upcoming.length" class="empty">No upcoming bookings yet.</li>
        </ul>

        <h2 class="group-h">Past</h2>
        <ul class="bk-list">
          <li *ngFor="let b of past" class="bk-row past">
            <div class="bk-info">
              <strong>{{ b.service.name }}</strong>
              <span class="bk-meta">{{ b.slot_label }} · {{ b.status | titlecase }}</span>
              <span class="bk-cust">Customer: {{ b.customer_email }}</span>
            </div>
            <span class="bk-price">\${{ (b.service.price_cents / 100).toFixed(2) }}</span>
          </li>
          <li *ngIf="!past.length" class="empty">No past bookings.</li>
        </ul>
      </main>
    </div>
  `,
  styles: [`
    .biz-app { min-height: 100dvh; background: #fafafa; font-family: -apple-system, sans-serif; color: #212121; }
    .biz-header { display: flex; align-items: center; gap: 16px; padding: 16px 24px; background: #fff; border-bottom: 1px solid #eee; }
    .back-btn { background: none; border: none; color: #555; cursor: pointer; }
    .biz-h1 { font-size: 1.2rem; margin: 0; }
    .biz-section { padding: 24px; max-width: 800px; margin: 0 auto; }
    .group-h { font-size: 1.05rem; margin: 24px 0 8px; color: #444; }
    .bk-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .bk-row { background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .bk-row.past { opacity: 0.7; }
    .bk-info { display: flex; flex-direction: column; gap: 2px; }
    .bk-meta { color: #666; font-size: 0.85rem; }
    .bk-cust { color: #5d5d5d; font-size: 0.85rem; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .back-btn { min-height: 44px; padding: 0 8px; }
    .bk-price { font-weight: 600; }
    .empty { color: #888; padding: 12px 0; text-align: center; }
  `],
})
export class BeautyBusinessBookingsComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get upcoming(): BookingRow[] {
    return (this.data['upcoming'] as BookingRow[]) || [];
  }
  get past(): BookingRow[] {
    return (this.data['past'] as BookingRow[]) || [];
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }
}
