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
import { formatSlotLocal } from './beauty-time.util';

interface BookingDetail {
  id: number;
  status: string;
  is_upcoming: boolean;
  slot_at: string;
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
      <header class="sub-header">
        <button
          type="button"
          class="back-btn"
          (click)="emit(links['bookings'] || links['home'])"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="sub-header-title">Booking</span>
        <span class="sub-header-spacer"></span>
      </header>

      <section class="hero-stripe" [attr.aria-label]="b.service.category || 'Service'"></section>

      <section class="detail-section">
        <div class="title-row">
          <h1 class="title">{{ b.service.name }}</h1>
          <span class="price">\${{ (b.service.price_cents / 100).toFixed(0) }}</span>
        </div>
        <div class="meta">
          {{ b.provider.location_label }} · {{ b.service.duration_minutes }} min
          <span class="status" [class.cancelled]="b.status === 'cancelled'">
            · {{ b.status | titlecase }}
          </span>
        </div>

        <div class="info-card">
          <div class="info-row">
            <span class="info-label">When</span>
            <span class="info-value">{{ formatLocal(b.slot_at) || b.slot_label }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Provider</span>
            <span class="info-value">
              {{ b.provider.name }}
              <small *ngIf="b.provider.short_description">{{ b.provider.short_description }}</small>
            </span>
          </div>
          <div class="info-row" *ngIf="b.service.description">
            <span class="info-label">About</span>
            <span class="info-value muted">{{ b.service.description }}</span>
          </div>
        </div>

        <p *ngIf="cancelError" class="server-error">{{ cancelError }}</p>
      </section>

      <div class="cta-row">
        <button
          *ngIf="links['reschedule']"
          type="button"
          class="btn-confirm"
          (click)="emit(links['reschedule'])"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          {{ links['reschedule'].prompt || 'Reschedule' }}
        </button>
        <button
          *ngIf="links['cancel']"
          type="button"
          class="btn-cancel"
          (click)="cancel()"
          [disabled]="isCancelling"
        >{{ isCancelling ? 'Cancelling…' : (links['cancel'].prompt || 'Cancel booking') }}</button>
        <button
          *ngIf="links['provider']"
          type="button"
          class="btn-ghost"
          (click)="emit(links['provider'])"
        >{{ links['provider'].prompt || 'View provider' }}</button>
      </div>

      <nav class="bottom-nav">
        <button type="button" class="nav-tab" (click)="emit(links['bookings'])" [disabled]="!links['bookings']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2.5"/>
            <path d="M3 10h18M8 3v4M16 3v4"/>
          </svg>
          <span class="nav-label">Bookings</span>
        </button>
        <button type="button" class="nav-tab" (click)="emit(links['home'])" [disabled]="!links['home']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 11l9-7 9 7v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9z"/>
          </svg>
          <span class="nav-label">Home</span>
        </button>
        <button type="button" class="nav-tab" (click)="emit(links['profile'])" [disabled]="!links['profile']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.8"/>
            <path d="M4.5 21c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5"/>
          </svg>
          <span class="nav-label">Profile</span>
        </button>
      </nav>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF;
      --ink: #0A0A0B; --success: #2F7A47; --danger: #C0392B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
    }
    * { box-sizing: border-box; }
    .beauty-app { display: flex; flex-direction: column; min-height: 100dvh; background: var(--surface); font-family: var(--font-body); color: var(--text); }

    .sub-header { display: flex; align-items: center; height: 56px; padding: 0 12px; background: var(--surface); border-bottom: 1px solid var(--line); flex-shrink: 0; }
    .sub-header-title { flex: 1; text-align: center; font-size: 0.95rem; font-weight: 600; color: var(--text); letter-spacing: 0.2px; }
    .sub-header-spacer { width: 36px; height: 36px; flex-shrink: 0; }
    .back-btn { width: 36px; height: 36px; border-radius: 8px; background: transparent; border: none; color: var(--text); display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
    .back-btn:hover { background: var(--surface-2); }

    .hero-stripe { height: 180px; flex-shrink: 0; background:
      repeating-linear-gradient(135deg, rgba(58,58,58,0.10) 0, rgba(58,58,58,0.10) 8px, rgba(58,58,58,0.16) 8px, rgba(58,58,58,0.16) 16px),
      linear-gradient(180deg, #3A3A3A 0%, #2A2A2A 100%); }

    .detail-section { padding: 20px 20px 12px; flex: 1; overflow-y: auto; }
    .title-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .title { font-family: var(--font-display); font-size: 1.75rem; font-weight: 500; line-height: 1.15; letter-spacing: 0.2px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .price { font-family: var(--font-display); font-size: 1.4rem; font-weight: 500; flex-shrink: 0; }
    .meta { font-size: 0.75rem; color: var(--text-muted); margin: 4px 0 18px; }
    .status { color: var(--success); font-weight: 600; }
    .status.cancelled { color: var(--danger); }

    .info-card { background: #FFFFFF; border: 1px solid var(--line); border-radius: 14px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(15,35,60,0.04); }
    .info-row { display: flex; flex-direction: column; gap: 4px; padding: 10px 0; border-bottom: 1px solid var(--line); }
    .info-row:first-child { padding-top: 0; }
    .info-row:last-child { border-bottom: none; padding-bottom: 0; }
    .info-label { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.2px; }
    .info-value { font-size: 0.875rem; color: var(--text); line-height: 1.4; }
    .info-value small { display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
    .info-value.muted { color: var(--text-muted); }

    .server-error { background: #FCE8E5; border: 1px solid #F4B5AE; border-radius: 10px; padding: 10px 14px; color: #8A2419; font-size: 0.8rem; line-height: 1.4; margin: 4px 0 12px; }

    .cta-row { display: flex; flex-direction: column; gap: 10px; padding: 12px 20px; background: var(--surface); border-top: 1px solid var(--line); flex-shrink: 0; }
    .btn-confirm, .btn-cancel, .btn-ghost {
      width: 100%; height: 46px; border-radius: 10px; cursor: pointer;
      font-family: var(--font-body); font-size: 0.875rem; font-weight: 600; letter-spacing: 0.2px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 150ms ease;
    }
    .btn-confirm { background: var(--success); color: #FFFFFF; border: 1px solid var(--success); box-shadow: 0 2px 8px rgba(47,122,71,0.2); }
    .btn-confirm:hover { background: #256238; border-color: #256238; }
    .btn-cancel { background: var(--danger); color: #FFFFFF; border: 1px solid var(--danger); box-shadow: 0 2px 8px rgba(192,57,43,0.2); }
    .btn-cancel:hover:not(:disabled) { background: #9F2E22; border-color: #9F2E22; }
    .btn-cancel:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-ghost { background: var(--ink); color: #FFFFFF; border: 1px solid var(--ink); box-shadow: 0 2px 8px rgba(10,10,11,0.18); }
    .btn-ghost:hover { background: #1F1F22; border-color: #1F1F22; }

    .bottom-nav { display: flex; background: #FFFFFF; border-top: 1px solid var(--line); box-shadow: 0 -2px 14px rgba(15,35,60,0.08); flex-shrink: 0; padding-bottom: env(safe-area-inset-bottom); }
    .nav-tab { flex: 1; height: 64px; background: transparent; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; position: relative; color: var(--text); font-family: var(--font-body); }
    .nav-tab:disabled { opacity: 0.4; cursor: not-allowed; }
    .nav-dot { position: absolute; top: 6px; width: 6px; height: 6px; border-radius: 50%; background: transparent; }
    .nav-icon { width: 24px; height: 24px; }
    .nav-label { font-size: 0.7rem; font-weight: 500; line-height: 1; letter-spacing: 0.1px; }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
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

  /** Render the booking time in the viewer's local timezone. */
  formatLocal(iso: string | undefined | null): string {
    return formatSlotLocal(iso);
  }
}
