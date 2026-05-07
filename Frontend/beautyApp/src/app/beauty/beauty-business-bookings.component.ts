/**
 * BeautyBusinessBookingsComponent — redesigned per Business Provider Portal handoff (bookings-1).
 * Pill-segmented Upcoming/Past/All tabs · sectioned list w/ date stack + status chip + price · empty state.
 */

import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from './beauty-bff.types';
import { BeautyProviderSubHeaderComponent } from './provider/prov-sub-header.component';
import { BeautyProviderTabBarComponent, ProviderTab } from './provider/prov-tab-bar.component';
import { resolveTabLink } from './provider/prov-tab-nav';
import { BeautyProviderCardComponent } from './provider/prov-card.component';
import { BeautyProviderButtonComponent } from './provider/prov-btn.component';
import { BeautyProviderEmptyHintComponent } from './provider/prov-empty-hint.component';

interface BookingRow {
  id: number;
  status: string;
  slot_at: string;
  slot_label: string;
  service: { id: number; name: string; duration_minutes: number; price_cents: number; price_dollars?: string };
  customer_email: string;
}

interface DisplayRow {
  id: number;
  month: string;
  day: string;
  dow: string;
  service: string;
  status: string;
  statusLabel: string;
  time: string;
  duration: number;
  customer: string;
  price: string;
}

type Tab = 'Upcoming' | 'Past' | 'All';

@Component({
  selector: 'app-beauty-business-bookings',
  standalone: true,
  imports: [
    CommonModule,
    BeautyProviderSubHeaderComponent,
    BeautyProviderTabBarComponent,
    BeautyProviderCardComponent,
    BeautyProviderButtonComponent,
    BeautyProviderEmptyHintComponent,
  ],
  template: `
    <div class="beauty-app prov-shell">
      <app-prov-sub-header back="Dashboard" title="Bookings"
                           (backClick)="emit(links['business_home'])"></app-prov-sub-header>

      <main id="main" class="prov-body">
        <div class="seg-tabs" role="tablist" aria-label="Bookings filter">
          <button *ngFor="let t of tabs" type="button" role="tab"
                  class="seg-tab" [class.is-selected]="activeTab === t"
                  [attr.aria-selected]="activeTab === t"
                  (click)="activeTab = t">{{ t }}</button>
        </div>

        <ng-container *ngIf="hasAny; else emptyState">
          <ng-container *ngIf="(activeTab === 'Upcoming' || activeTab === 'All') && upcomingDisplay.length">
            <h3 class="section-title">This week</h3>
            <app-prov-card padding="0 14px" class="bk-card">
              <div *ngFor="let b of upcomingDisplay; let last = last"
                   class="bk-row" [class.last]="last">
                <ng-container *ngTemplateOutlet="bkRow; context: {$implicit: b}"></ng-container>
              </div>
            </app-prov-card>
          </ng-container>
          <ng-container *ngIf="(activeTab === 'Past' || activeTab === 'All') && pastDisplay.length">
            <h3 class="section-title">Past</h3>
            <app-prov-card padding="0 14px" class="bk-card">
              <div *ngFor="let b of pastDisplay; let last = last"
                   class="bk-row" [class.last]="last">
                <ng-container *ngTemplateOutlet="bkRow; context: {$implicit: b}"></ng-container>
              </div>
            </app-prov-card>
          </ng-container>
        </ng-container>

        <ng-template #emptyState>
          <app-prov-empty-hint
            title="No bookings yet"
            body="Bookings appear here once customers reserve a slot. Make sure you have services and hours set.">
            <app-prov-btn variant="secondary" (clicked)="emit(links['services'])">View storefront →</app-prov-btn>
          </app-prov-empty-hint>
        </ng-template>

        <ng-template #bkRow let-b>
          <div class="date-stack">
            <div class="ds-month">{{ b.month }}</div>
            <div class="ds-day">{{ b.day }}</div>
            <div class="ds-dow">{{ b.dow }}</div>
          </div>
          <div class="bk-info">
            <div class="bk-row-1">
              <span class="bk-svc">{{ b.service }}</span>
              <span class="status-chip" [attr.data-status]="b.status">{{ b.statusLabel }}</span>
            </div>
            <div class="bk-mono">{{ b.time }} · {{ b.duration }} min</div>
            <div class="bk-cust">{{ b.customer }}</div>
          </div>
          <div class="bk-price">\${{ b.price }}</div>
        </ng-template>
      </main>

      <app-prov-tab-bar active="bookings" [badges]="tabBadges" (tabClick)="onTab($event)"></app-prov-tab-bar>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue-deep: #7DA8CF; --danger: #C0392B;
      --success-soft: #E5F3EA; --success-fg: #2F7A47;
      --warn-soft: #FFF4DA; --warn-fg: #8A6A1F;
      --danger-soft: #FCE8E5; --danger-fg: #C0392B;
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

    .seg-tabs {
      display: flex; gap: 0;
      background: #FFFFFF;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 3px;
      margin-bottom: 14px;
    }
    .seg-tab {
      flex: 1; min-height: 44px;
      text-align: center;
      padding: 8px 0;
      border-radius: 999px;
      font-size: 12px; font-weight: 600;
      background: transparent;
      color: var(--text-muted);
      border: none;
      cursor: pointer;
    }
    .seg-tab.is-selected {
      background: var(--text);
      color: #FFFFFF;
    }

    .section-title {
      margin: 0 0 8px;
      font-family: var(--font-display);
      font-size: 22px; font-weight: 500;
      color: var(--text);
    }
    .bk-card { display: block; margin-bottom: 14px; }

    .bk-row {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 14px 0;
      border-bottom: 1px solid var(--line);
    }
    .bk-row.last { border-bottom: none; }

    .date-stack {
      width: 48px; flex-shrink: 0;
      text-align: center;
      background: var(--surface);
      border-radius: 8px;
      border: 1px solid var(--line);
      padding: 4px 0;
    }
    .ds-month {
      font-size: 9px; font-weight: 700;
      color: var(--accent-blue-deep);
      letter-spacing: 1px; text-transform: uppercase;
    }
    .ds-day {
      font-family: var(--font-display);
      font-size: 20px; font-weight: 500;
      color: var(--text);
      line-height: 1;
    }
    .ds-dow {
      font-family: var(--font-mono);
      font-size: 9px;
      color: var(--text-muted);
      margin-top: 1px;
    }

    .bk-info { flex: 1; min-width: 0; }
    .bk-row-1 {
      display: flex; align-items: center; gap: 6px;
      margin-bottom: 4px;
    }
    .bk-svc { font-size: 14px; font-weight: 600; color: var(--text); }
    .status-chip {
      font-size: 9px; font-weight: 700;
      letter-spacing: 0.4px; text-transform: uppercase;
      padding: 2px 6px; border-radius: 999px;
    }
    .status-chip[data-status="booked"],
    .status-chip[data-status="completed"] { background: var(--success-soft); color: var(--success-fg); }
    .status-chip[data-status="pending"] { background: var(--warn-soft); color: var(--warn-fg); }
    .status-chip[data-status^="cancelled"] { background: var(--danger-soft); color: var(--danger-fg); }
    .bk-mono {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    .bk-cust { font-size: 12px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .bk-price {
      font-family: var(--font-display);
      font-size: 18px; font-weight: 500;
      color: var(--text);
      line-height: 1;
      flex-shrink: 0;
      text-align: right;
    }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
  `],
})
export class BeautyBusinessBookingsComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  tabs: Tab[] = ['Upcoming', 'Past', 'All'];
  activeTab: Tab = 'Upcoming';

  get rawUpcoming(): BookingRow[] { return (this.data['upcoming'] as BookingRow[]) || []; }
  get rawPast(): BookingRow[] { return (this.data['past'] as BookingRow[]) || []; }
  get hasAny(): boolean { return this.rawUpcoming.length + this.rawPast.length > 0; }

  get upcomingDisplay(): DisplayRow[] {
    return this.rawUpcoming.map((b) => this.toDisplay(b));
  }
  get pastDisplay(): DisplayRow[] {
    return this.rawPast.map((b) => this.toDisplay(b));
  }

  get tabBadges(): { bookings?: number; messages?: number } {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  private toDisplay(b: BookingRow): DisplayRow {
    const d = new Date(b.slot_at);
    const month = d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
    const day = d.getDate().toString();
    const dow = d.toLocaleDateString(undefined, { weekday: 'short' });
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const dollars = b.service.price_dollars || ((b.service.price_cents || 0) / 100).toFixed(2);
    return {
      id: b.id, month, day, dow,
      service: b.service.name,
      status: b.status,
      statusLabel: this.label(b.status),
      time,
      duration: b.service.duration_minutes,
      customer: b.customer_email,
      price: dollars,
    };
  }

  private label(s: string): string {
    if (s === 'booked') return 'Confirmed';
    if (s === 'completed') return 'Completed';
    if (s === 'pending') return 'Pending';
    if (s.startsWith('cancelled')) return 'Cancelled';
    return s;
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  onTab(tab: ProviderTab): void {
    this.emit(resolveTabLink(tab, this.links, 'bookings'));
  }
}
