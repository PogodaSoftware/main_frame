/**
 * BeautyBookingDetailComponent (Presentational)
 * ---------------------------------------------
 * Detail view for a single booking — shown when the customer taps a
 * row on the My Bookings list. Exposes a Cancel action for upcoming
 * bookings via the HATEOAS `cancel` link the BFF supplies.
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

interface BookingDetail {
  id: number;
  status: string;
  is_upcoming: boolean;
  slot_label: string;
  service: {
    id: number;
    name: string;
    description: string;
    price_cents: number;
    duration_minutes: number;
    category: string;
  };
  provider: {
    id: number;
    name: string;
    short_description: string;
    location_label: string;
  };
}

@Component({
  selector: 'app-beauty-booking-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="beauty-app" *ngIf="booking as b">
      <header class="beauty-header">
        <span class="brand-icon">✨</span>
        <button class="brand-name-btn" (click)="emit(links['home'])">Beauty</button>
      </header>

      <section class="detail-section">
        <button
          class="back-btn"
          (click)="emit(links['bookings'])"
          *ngIf="links['bookings']"
        >← {{ links['bookings'].prompt || 'Back to My Bookings' }}</button>

        <h1 class="title">{{ b.service.name }}</h1>
        <p class="meta">
          {{ b.service.duration_minutes }} min ·
          \${{ (b.service.price_cents / 100).toFixed(2) }} ·
          <span class="status" [class.cancelled]="b.status === 'cancelled'">
            {{ b.status | titlecase }}
          </span>
        </p>

        <div class="card">
          <p><strong>When</strong><br />{{ b.slot_label }}</p>
          <p>
            <strong>Provider</strong><br />
            {{ b.provider.name }}<br />
            <span class="muted">{{ b.provider.location_label }}</span>
          </p>
          <p *ngIf="b.service.description">
            <strong>About this service</strong><br />
            <span class="muted">{{ b.service.description }}</span>
          </p>
        </div>

        <p *ngIf="cancelError" class="server-error">{{ cancelError }}</p>

        <div class="cta-row">
          <button
            *ngIf="links['reschedule']"
            class="btn-reschedule"
            (click)="emit(links['reschedule'])"
          >{{ links['reschedule'].prompt || 'Reschedule' }}</button>
          <button
            *ngIf="links['cancel']"
            class="btn-cancel"
            (click)="cancel()"
            [disabled]="isCancelling"
          >{{ isCancelling ? 'Cancelling…' : (links['cancel'].prompt || 'Cancel this booking') }}</button>
          <button
            *ngIf="links['provider']"
            class="btn-link"
            (click)="emit(links['provider'])"
          >{{ links['provider'].prompt || 'View provider' }}</button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .beauty-app { min-height: 100dvh; background: #fff; font-family: -apple-system, sans-serif; color: #212121; }
    .beauty-header { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; }
    .brand-icon { font-size: 1.4rem; margin-right: 6px; }
    .brand-name-btn { background: none; border: none; font-size: 1.1rem; font-weight: 600; cursor: pointer; }
    .detail-section { padding: 24px 20px 64px; max-width: 560px; margin: 0 auto; }
    .back-btn { background: none; border: none; color: #555; cursor: pointer; padding: 0 0 16px; font-size: 0.9rem; }
    .title { font-size: 1.6rem; margin: 0 0 4px; }
    .meta { color: #666; margin: 0 0 20px; }
    .status { padding: 2px 8px; border-radius: 999px; background: #e6f7ed; color: #1b8a3a; font-size: 0.8rem; }
    .status.cancelled { background: #fdecea; color: #c62828; }
    .card { border: 1px solid #eee; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .card p { margin: 0 0 12px; }
    .card p:last-child { margin: 0; }
    .muted { color: #777; }
    .cta-row { display: flex; flex-direction: column; gap: 10px; }
    .btn-reschedule { background: #000; color: #fff; border: none; border-radius: 10px; padding: 12px; cursor: pointer; }
    .btn-cancel { background: #fff; color: #c62828; border: 1px solid #c62828; border-radius: 10px; padding: 12px; cursor: pointer; }
    .btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-link { background: none; border: 1px solid #ddd; border-radius: 10px; padding: 12px; cursor: pointer; }
    .server-error { color: #c62828; font-size: 0.9rem; }
  `],
})
export class BeautyBookingDetailComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  isCancelling = false;
  cancelError = '';

  constructor(private authService: BeautyAuthService) {}

  get booking(): BookingDetail | null {
    return (this.data['booking'] as BookingDetail) || null;
  }

  cancel(): void {
    const link = this.links['cancel'];
    if (!link || this.isCancelling) return;
    this.isCancelling = true;
    this.cancelError = '';
    this.authService.follow(link).subscribe({
      next: () => {
        this.isCancelling = false;
        // Re-resolve so the screen shows the new "cancelled" status
        // and the cancel button disappears.
        const self = this.links['self'];
        if (self) this.followLink.emit(self);
      },
      error: () => {
        this.isCancelling = false;
        this.cancelError = 'Could not cancel that booking. Please try again.';
      },
    });
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }
}
