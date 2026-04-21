/**
 * BeautyBookingSuccessComponent (Presentational)
 * ----------------------------------------------
 * Confirmation screen shown after a customer successfully creates a
 * booking. Renders the BFF-supplied booking summary and CTAs to
 * My Bookings / Booking Detail / Home.
 */

import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from './beauty-bff.types';

interface BookingSummary {
  id: number;
  status: string;
  slot_label: string;
  service: { name: string; price_cents: number; duration_minutes: number };
  provider: { name: string; location_label: string };
}

@Component({
  selector: 'app-beauty-booking-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="beauty-app">
      <header class="beauty-header">
        <span class="brand-icon">✨</span>
        <button class="brand-name-btn" (click)="emit(links['home'])">Beauty</button>
      </header>

      <section class="success-section" *ngIf="booking">
        <div class="success-mark" aria-hidden="true">✓</div>
        <h1 class="success-title">Booking confirmed</h1>
        <p class="success-sub">
          You're booked for <strong>{{ booking.service.name }}</strong>
          at <strong>{{ booking.provider.name }}</strong>.
        </p>

        <div class="summary-card">
          <p><strong>When</strong><br />{{ booking.slot_label }}</p>
          <p><strong>Where</strong><br />{{ booking.provider.location_label }}</p>
          <p>
            <strong>Total</strong><br />
            \${{ (booking.service.price_cents / 100).toFixed(2) }}
            · {{ booking.service.duration_minutes }} min
          </p>
        </div>

        <div class="cta-row">
          <button
            class="btn-primary"
            (click)="emit(links['bookings'])"
            *ngIf="links['bookings']"
          >{{ links['bookings'].prompt || 'My Bookings' }}</button>
          <button
            class="btn-link"
            (click)="emit(links['detail'])"
            *ngIf="links['detail']"
          >{{ links['detail'].prompt || 'View this booking' }}</button>
          <button
            class="btn-link"
            (click)="emit(links['home'])"
            *ngIf="links['home']"
          >{{ links['home'].prompt || 'Home' }}</button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .beauty-app { min-height: 100dvh; background: #fff; font-family: -apple-system, sans-serif; color: #212121; }
    .beauty-header { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; }
    .brand-icon { font-size: 1.4rem; margin-right: 6px; }
    .brand-name-btn { background: none; border: none; font-size: 1.1rem; font-weight: 600; cursor: pointer; }
    .success-section { padding: 32px 20px 64px; max-width: 520px; margin: 0 auto; text-align: center; }
    .success-mark { width: 64px; height: 64px; line-height: 64px; border-radius: 50%; background: #e6f7ed; color: #1b8a3a; font-size: 2rem; margin: 0 auto 16px; }
    .success-title { font-size: 1.75rem; margin: 0 0 8px; }
    .success-sub { color: #555; margin: 0 0 24px; }
    .summary-card { text-align: left; border: 1px solid #eee; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
    .summary-card p { margin: 0 0 12px; }
    .summary-card p:last-child { margin: 0; }
    .cta-row { display: flex; flex-direction: column; gap: 8px; }
    .btn-primary { background: #000; color: #fff; border: none; border-radius: 10px; padding: 14px; font-size: 1rem; cursor: pointer; }
    .btn-link { background: none; border: 1px solid #ddd; border-radius: 10px; padding: 12px; cursor: pointer; }
  `],
})
export class BeautyBookingSuccessComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get booking(): BookingSummary | null {
    return (this.data['booking'] as BookingSummary) || null;
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }
}
