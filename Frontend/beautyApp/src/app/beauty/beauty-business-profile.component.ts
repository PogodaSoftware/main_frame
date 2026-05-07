/**
 * BeautyBusinessProfileComponent — redesigned per Business Provider Portal handoff (prof-1).
 * Identity card + earnings card (lifetime + 3 splits) + View payouts secondary button.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from './beauty-bff.types';
import { BeautyProviderSubHeaderComponent } from './provider/prov-sub-header.component';
import { BeautyProviderTabBarComponent, ProviderTab } from './provider/prov-tab-bar.component';
import { resolveTabLink } from './provider/prov-tab-nav';
import { BeautyProviderCardComponent } from './provider/prov-card.component';
import { BeautyProviderButtonComponent } from './provider/prov-btn.component';

interface EarningsPayload {
  currency?: string;
  total_cents?: number;
  this_month_cents?: number;
  this_year_cents?: number;
  total_dollars?: string;
  this_month_dollars?: string;
  this_year_dollars?: string;
  paid_bookings_count?: number;
}

@Component({
  selector: 'app-beauty-business-profile',
  standalone: true,
  imports: [
    CommonModule,
    BeautyProviderSubHeaderComponent,
    BeautyProviderTabBarComponent,
    BeautyProviderCardComponent,
    BeautyProviderButtonComponent,
  ],
  template: `
    <div class="beauty-app prov-shell">
      <app-prov-sub-header back="Dashboard" title="Profile"
                           (backClick)="emit(links['business_home'])">
        <button slot="right" type="button" class="gear-btn" aria-label="Settings"
                (click)="emit(links['settings'])" [disabled]="!links['settings']">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </app-prov-sub-header>

      <main id="main" class="prov-body">
        <app-prov-card [padding]="16" class="ident-card">
          <div class="ident-row">
            <div class="avatar" aria-hidden="true">{{ initial }}</div>
            <div class="ident-text">
              <div class="biz-name">{{ business?.business_name || 'Your storefront' }}</div>
              <div class="biz-email">{{ business?.email }}</div>
              <div class="status-line">
                <span class="green-dot" aria-hidden="true"></span>
                <span>Storefront live</span>
              </div>
            </div>
          </div>
        </app-prov-card>

        <app-prov-card [padding]="0" class="earn-card">
          <div class="earn-head">
            <div class="earn-title">Earnings</div>
            <div class="earn-sub">Total customers have paid you.</div>
          </div>
          <div class="earn-lifetime">
            <span class="lt-label">Lifetime total</span>
            <span class="lt-value">\${{ totalDollars }}</span>
          </div>
          <div class="earn-row">
            <span>This month</span>
            <span class="mono">\${{ monthDollars }}</span>
          </div>
          <div class="earn-row">
            <span>This year</span>
            <span class="mono">\${{ yearDollars }}</span>
          </div>
          <div class="earn-row last">
            <span>Paid bookings</span>
            <span class="mono">{{ earnings.paid_bookings_count ?? 0 }}</span>
          </div>
        </app-prov-card>

        <app-prov-btn variant="secondary" [full]="true">View payouts →</app-prov-btn>
      </main>

      <app-prov-tab-bar active="profile" [badges]="tabBadges" (tabClick)="onTab($event)"></app-prov-tab-bar>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue-deep: #7DA8CF; --success: #2F7A47;
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
    .prov-body { flex: 1; padding: 20px 16px; overflow-y: auto; }

    .gear-btn {
      width: 44px; height: 44px;
      min-width: 44px; min-height: 44px;
      border-radius: 10px;
      background: #FFFFFF;
      border: 1px solid var(--line);
      display: grid; place-items: center;
      cursor: pointer;
      color: var(--text);
    }
    .gear-btn[disabled] { opacity: 0.5; cursor: not-allowed; }

    .ident-card { display: block; margin-bottom: 14px; }
    .ident-row { display: flex; align-items: center; gap: 14px; }
    .avatar {
      width: 56px; height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #BFD8EE, #7DA8CF);
      display: grid; place-items: center;
      font-family: var(--font-display);
      font-size: 24px; font-weight: 500;
      color: #1a3a52;
      flex-shrink: 0;
    }
    .ident-text { flex: 1; min-width: 0; }
    .biz-name {
      font-family: var(--font-display);
      font-size: 22px; font-weight: 500;
      letter-spacing: 0.2px;
      color: var(--text);
    }
    .biz-email {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .status-line {
      display: inline-flex; align-items: center; gap: 5px;
      margin-top: 6px;
      font-size: 11px; font-weight: 600;
      color: var(--success);
    }
    .green-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--success);
    }

    .earn-card {
      display: block;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .earn-head {
      padding: 14px 16px 12px;
      border-bottom: 1px solid var(--line);
    }
    .earn-title {
      font-family: var(--font-display);
      font-size: 18px; font-weight: 500;
      color: var(--text);
      letter-spacing: 0.2px;
    }
    .earn-sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .earn-lifetime {
      padding: 14px 16px;
      display: flex; align-items: baseline; justify-content: space-between;
    }
    .lt-label { font-size: 12px; color: var(--text-muted); }
    .lt-value {
      font-family: var(--font-display);
      font-size: 30px; font-weight: 500;
      color: var(--accent-blue-deep);
      letter-spacing: 0.2px;
    }
    .earn-row {
      padding: 12px 16px;
      border-top: 1px solid var(--line);
      display: flex; justify-content: space-between; align-items: center;
      font-size: 13px;
      color: var(--text-muted);
    }
    .earn-row.last { border-bottom: none; }
    .mono {
      font-family: var(--font-mono);
      font-size: 13px; font-weight: 700;
      color: var(--text);
    }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
  `],
})
export class BeautyBusinessProfileComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get business(): { email?: string; business_name?: string } | null {
    return (this.data['business'] as { email?: string; business_name?: string }) || null;
  }

  get earnings(): EarningsPayload {
    return (this.data['earnings'] as EarningsPayload) || {};
  }

  get initial(): string {
    return (this.business?.business_name || '·').trim()[0]?.toUpperCase() || '·';
  }

  get totalDollars(): string {
    return this.fmt(this.earnings.total_dollars, this.earnings.total_cents);
  }
  get monthDollars(): string {
    return this.fmt(this.earnings.this_month_dollars, this.earnings.this_month_cents);
  }
  get yearDollars(): string {
    return this.fmt(this.earnings.this_year_dollars, this.earnings.this_year_cents);
  }

  get tabBadges(): { bookings?: number; messages?: number } {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  private fmt(dollars?: string, cents?: number): string {
    const v = dollars ? parseFloat(dollars) : (cents || 0) / 100;
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  onTab(tab: ProviderTab): void {
    this.emit(resolveTabLink(tab, this.links, 'profile'));
  }
}
