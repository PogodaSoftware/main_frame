/**
 * BeautyBookingsComponent (Presentational)
 * ----------------------------------------
 * Lists the signed-in customer's upcoming and past bookings. Cancel
 * actions are HATEOAS POST links the shell handles via BeautyAuthService.
 * After a successful cancel we re-emit the self link so the shell
 * re-resolves and the lists update.
 */

import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';

interface BookingItem {
  id: number;
  status: string;
  slot_at: string;
  slot_label: string;
  service: { id: number; name: string; price_cents: number; duration_minutes: number };
  provider: { id: number; name: string; location_label: string };
  _links?: Record<string, BffLink>;
}

@Component({
  selector: 'app-beauty-bookings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="beauty-app">
      <header class="beauty-header">
        <div class="header-brand">
          <span class="brand-icon">✨</span>
          <button class="brand-name-btn" (click)="emit(links['home'])">Beauty</button>
        </div>
        <div class="header-actions">
          <button class="btn-link" (click)="emit(links['profile'])" *ngIf="links['profile']">
            Profile
          </button>
        </div>
      </header>

      <section class="bookings-section">
        <h1 class="bookings-title">My Bookings</h1>

        <h2 class="group-h">Upcoming</h2>
        <ul class="bookings-ul">
          <li *ngFor="let b of upcoming" class="booking-row">
            <div class="b-info">
              <strong>{{ b.service.name }}</strong>
              <span class="b-prov">{{ b.provider.name }} · {{ b.provider.location_label }}</span>
              <span class="b-slot">{{ b.slot_label }}</span>
            </div>
            <button
              class="btn-cancel"
              (click)="cancel(b)"
              [disabled]="busyId === b.id"
            >{{ busyId === b.id ? 'Cancelling…' : 'Cancel' }}</button>
          </li>
          <li *ngIf="!upcoming.length" class="empty">No upcoming bookings yet.</li>
        </ul>

        <h2 class="group-h">Past</h2>
        <ul class="bookings-ul">
          <li *ngFor="let b of past" class="booking-row past">
            <div class="b-info">
              <strong>{{ b.service.name }}</strong>
              <span class="b-prov">{{ b.provider.name }}</span>
              <span class="b-slot">{{ b.slot_label }} · {{ b.status | titlecase }}</span>
            </div>
          </li>
          <li *ngIf="!past.length" class="empty">No past bookings.</li>
        </ul>
      </section>
    </div>
  `,
  styles: [`
    .beauty-app { min-height: 100dvh; background: #fff; font-family: -apple-system, sans-serif; color: #212121; }
    .beauty-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #eee; }
    .brand-icon { font-size: 1.4rem; margin-right: 6px; }
    .brand-name-btn { background: none; border: none; font-size: 1.1rem; font-weight: 600; cursor: pointer; }
    .btn-link { background: none; border: 1px solid #ddd; border-radius: 8px; padding: 6px 12px; cursor: pointer; }
    .bookings-section { padding: 24px 20px 64px; max-width: 720px; margin: 0 auto; }
    .bookings-title { font-size: 2rem; margin: 0 0 16px; }
    .group-h { font-size: 1.1rem; margin: 24px 0 8px; color: #444; }
    .bookings-ul { list-style: none; padding: 0; margin: 0; }
    .booking-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-top: 1px solid #f0f0f0; }
    .booking-row.past { opacity: 0.7; }
    .b-info { display: flex; flex-direction: column; gap: 2px; }
    .b-prov { font-size: 0.85rem; color: #666; }
    .b-slot { font-size: 0.85rem; color: #888; }
    .btn-cancel { background: #fff; color: #c62828; border: 1px solid #c62828; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
    .btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
    .empty { color: #888; padding: 12px 0; }
  `],
})
export class BeautyBookingsComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  busyId: number | null = null;

  constructor(private authService: BeautyAuthService) {}

  get upcoming(): BookingItem[] {
    return (this.data['upcoming'] as BookingItem[]) || [];
  }
  get past(): BookingItem[] {
    return (this.data['past'] as BookingItem[]) || [];
  }

  cancel(b: BookingItem): void {
    const link = b._links?.['cancel'];
    if (!link || this.busyId != null) return;
    this.busyId = b.id;
    this.authService.follow(link).subscribe({
      next: () => {
        this.busyId = null;
        // Re-resolve this same screen.
        const self = this.links['self'];
        if (self) this.followLink.emit(self);
      },
      error: () => {
        this.busyId = null;
      },
    });
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }
}
