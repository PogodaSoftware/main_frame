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
import { formatSlotLocal } from './beauty-time.util';

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
      <header class="sub-header">
        <button type="button" class="back-btn" (click)="emit(links['home'])" aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="sub-header-title">My Bookings</span>
        <span class="sub-header-spacer"></span>
      </header>

      <section class="bookings-section">
        <h1 class="page-title">Bookings</h1>
        <div class="page-sub">Manage your appointments</div>

        <div class="segmented" role="tablist">
          <button
            type="button"
            role="tab"
            class="seg-tab"
            [class.is-active]="activeTab === 'upcoming'"
            [attr.aria-selected]="activeTab === 'upcoming'"
            (click)="activeTab = 'upcoming'"
          >Upcoming · {{ upcoming.length }}</button>
          <button
            type="button"
            role="tab"
            class="seg-tab"
            [class.is-active]="activeTab === 'past'"
            [attr.aria-selected]="activeTab === 'past'"
            (click)="activeTab = 'past'"
          >Past · {{ past.length }}</button>
        </div>

        <ng-container *ngIf="activeTab === 'upcoming'">
          <div *ngIf="!upcoming.length" class="empty-card">
            <div class="empty-title">No upcoming bookings</div>
            <div class="empty-sub">Pick a service from the home screen to schedule.</div>
            <button
              type="button"
              class="btn-browse"
              (click)="emit(links['home'])"
              *ngIf="links['home']"
            >Browse services</button>
          </div>
          <div *ngFor="let b of upcoming" class="b-card">
            <div class="b-card-head">
              <button
                type="button"
                class="b-card-title-btn"
                (click)="openDetails(b)"
                [attr.aria-label]="'View details for ' + b.service.name"
              >
                <span class="b-dot is-upcoming" aria-hidden="true"></span>
                <span class="b-title">{{ b.service.name }}</span>
              </button>
              <span class="b-status is-upcoming">Upcoming</span>
            </div>
            <div class="b-place">{{ b.provider.name }} · {{ b.provider.location_label }}</div>
            <div class="b-when">{{ formatLocal(b.slot_at) || b.slot_label }}</div>
          </div>

          <ng-container *ngIf="past.length">
            <div class="section-label">Past</div>
            <div *ngFor="let b of past" class="b-card past">
              <div class="b-card-head">
                <button
                  type="button"
                  class="b-card-title-btn"
                  (click)="openDetails(b)"
                  [attr.aria-label]="'View details for ' + b.service.name"
                >
                  <span class="b-dot" [class.is-cancelled]="b.status === 'cancelled'" aria-hidden="true"></span>
                  <span class="b-title">{{ b.service.name }}</span>
                </button>
                <span class="b-status" [class.is-cancelled]="b.status === 'cancelled'">{{ b.status | titlecase }}</span>
              </div>
              <div class="b-place">{{ b.provider.name }}</div>
              <div class="b-when">{{ formatLocal(b.slot_at) || b.slot_label }}</div>
            </div>
          </ng-container>
        </ng-container>

        <ng-container *ngIf="activeTab === 'past'">
          <div *ngIf="!past.length" class="empty-card past">
            <div class="empty-title">No past bookings</div>
          </div>
          <ng-container *ngIf="past.length">
            <div class="section-label">Past</div>
            <div *ngFor="let b of past" class="b-card past">
              <div class="b-card-head">
                <button
                  type="button"
                  class="b-card-title-btn"
                  (click)="openDetails(b)"
                  [attr.aria-label]="'View details for ' + b.service.name"
                >
                  <span class="b-dot" [class.is-cancelled]="b.status === 'cancelled'" aria-hidden="true"></span>
                  <span class="b-title">{{ b.service.name }}</span>
                </button>
                <span class="b-status" [class.is-cancelled]="b.status === 'cancelled'">{{ b.status | titlecase }}</span>
              </div>
              <div class="b-place">{{ b.provider.name }}</div>
              <div class="b-when">{{ formatLocal(b.slot_at) || b.slot_label }}</div>
            </div>
          </ng-container>
        </ng-container>
      </section>

      <nav class="bottom-nav">
        <button type="button" class="nav-tab is-active" (click)="emit(links['self'])">
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
    .sub-header-title { flex: 1; text-align: center; font-family: var(--font-body); font-size: 0.95rem; font-weight: 600; color: var(--text); letter-spacing: 0.2px; }
    .sub-header-spacer { width: 36px; height: 36px; flex-shrink: 0; }
    .back-btn { width: 36px; height: 36px; border-radius: 8px; background: transparent; border: none; color: var(--text); display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
    .back-btn:hover { background: var(--surface-2); }
    .section-label { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.2px; margin: 18px 0 10px; }
    .bookings-section { flex: 1; padding: 20px 20px 16px; max-width: 720px; width: 100%; margin: 0 auto; overflow-y: auto; }
    .page-title { font-family: var(--font-display); font-size: 2rem; font-weight: 500; margin: 0 0 4px; color: var(--text); letter-spacing: 0.2px; }
    .page-sub { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 18px; }

    .segmented { display: flex; background: var(--surface-2); padding: 3px; border-radius: 10px; margin-bottom: 18px; }
    .seg-tab { flex: 1; height: 32px; border-radius: 8px; background: transparent; border: 1px solid transparent; color: var(--text-muted); font-family: var(--font-body); font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 150ms ease; }
    .seg-tab.is-active { background: #FFFFFF; border-color: var(--line); color: var(--text); font-weight: 600; box-shadow: 0 1px 2px rgba(15,35,60,0.06); }

    .empty-card { background: var(--accent-blue); border: 1px solid rgba(125, 168, 207, 0.2); border-radius: 12px; padding: 20px 16px; text-align: center; margin-bottom: 16px; }
    .empty-card.past { background: var(--surface-2); border-color: var(--line); }
    .empty-title { font-family: var(--font-display); font-size: 1.25rem; font-weight: 500; color: #1a3a52; margin-bottom: 4px; }
    .empty-card.past .empty-title { color: var(--text); }
    .empty-sub { font-size: 0.75rem; color: #1a3a52; opacity: 0.75; margin-bottom: 12px; }
    .btn-browse { height: 36px; padding: 0 16px; border-radius: 10px; background: var(--ink); color: #FFFFFF; border: 1px solid var(--ink); font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 150ms ease; }
    .btn-browse:hover { background: #1F1F22; }

    .b-card { background: #FFFFFF; border: 1px solid var(--line); border-radius: 12px; padding: 14px; margin-bottom: 10px; }
    .b-card.past { opacity: 0.78; }
    .b-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
    .b-card-title-btn { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; background: none; border: none; padding: 0; cursor: pointer; color: inherit; font: inherit; text-align: left; }
    .b-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-muted); flex-shrink: 0; }
    .b-dot.is-upcoming { background: var(--success); }
    .b-dot.is-cancelled { background: var(--danger); }
    .b-title { font-family: var(--font-display); font-size: 1.1rem; font-weight: 500; line-height: 1.3; letter-spacing: 0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .b-card-title-btn:hover .b-title { text-decoration: underline; text-underline-offset: 2px; }
    .b-status { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; padding: 3px 8px; border-radius: 999px; background: #EDEDEF; color: #555; flex-shrink: 0; white-space: nowrap; }
    .b-status.is-upcoming { background: #E5F3EA; color: #1D4F2C; }
    .b-status.is-cancelled { background: #FCE8E5; color: #8A2419; }
    .b-place { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .b-when { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 0.7rem; color: var(--text-muted); }

    .btn-cancel { margin-top: 10px; background: transparent; color: var(--danger); border: 1.5px solid var(--danger); border-radius: 10px; padding: 8px 14px; font-size: 0.75rem; font-weight: 600; cursor: pointer; font-family: var(--font-body); transition: all 150ms ease; }
    .btn-cancel:hover:not(:disabled) { background: rgba(192, 57, 43, 0.06); }
    .btn-cancel:disabled { opacity: 0.6; cursor: not-allowed; }

    .bottom-nav { display: flex; background: #FFFFFF; border-top: 1px solid var(--line); box-shadow: 0 -2px 14px rgba(15,35,60,0.08); flex-shrink: 0; padding-bottom: env(safe-area-inset-bottom); }
    .nav-tab { flex: 1; height: 64px; background: transparent; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; position: relative; color: var(--text); font-family: var(--font-body); }
    .nav-tab:disabled { opacity: 0.4; cursor: not-allowed; }
    .nav-tab.is-active { color: var(--accent-blue-deep); }
    .nav-dot { position: absolute; top: 6px; width: 6px; height: 6px; border-radius: 50%; background: transparent; }
    .nav-tab.is-active .nav-dot { background: var(--accent-blue-deep); }
    .nav-icon { width: 24px; height: 24px; }
    .nav-label { font-size: 0.7rem; font-weight: 500; line-height: 1; letter-spacing: 0.1px; }
    .nav-tab.is-active .nav-label { font-weight: 600; }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
  `],
})
export class BeautyBookingsComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  busyId: number | null = null;
  activeTab: 'upcoming' | 'past' = 'upcoming';

  constructor(private authService: BeautyAuthService) {}

  get upcoming(): BookingItem[] {
    return (this.data['upcoming'] as BookingItem[]) || [];
  }
  get past(): BookingItem[] {
    return (this.data['past'] as BookingItem[]) || [];
  }

  openDetails(b: BookingItem): void {
    const link = b._links?.['detail'];
    if (link) this.followLink.emit(link);
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

  /** Render the booking time in the viewer's local timezone. */
  formatLocal(iso: string | undefined | null): string {
    return formatSlotLocal(iso);
  }
}
