/**
 * BeautyBusinessServicesComponent — redesigned per Business Provider Portal handoff (svc-v1).
 * Sub-header + service rows in a card + delete confirm modal.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyConfirmModalComponent } from './beauty-confirm-modal.component';
import { BeautyProviderSubHeaderComponent } from './provider/prov-sub-header.component';
import { BeautyProviderTabBarComponent, ProviderTab } from './provider/prov-tab-bar.component';
import { resolveTabLink } from './provider/prov-tab-nav';
import { BeautyProviderCardComponent } from './provider/prov-card.component';
import { BeautyProviderButtonComponent } from './provider/prov-btn.component';
import { BeautyProviderEmptyHintComponent } from './provider/prov-empty-hint.component';

interface ServiceRow {
  id: number;
  name: string;
  description: string;
  category: string;
  category_label: string;
  price_cents: number;
  price_dollars?: string;
  duration_minutes: number;
  _links?: Record<string, BffLink>;
}

const CATEGORY_HUE: Record<string, string> = {
  facial: '#A88A7A',
  massage: '#7A8B6E',
  nails: '#C28A82',
  hair: '#5C4A3F',
};

@Component({
  selector: 'app-beauty-business-services',
  standalone: true,
  imports: [
    CommonModule,
    BeautyConfirmModalComponent,
    BeautyProviderSubHeaderComponent,
    BeautyProviderTabBarComponent,
    BeautyProviderCardComponent,
    BeautyProviderButtonComponent,
    BeautyProviderEmptyHintComponent,
  ],
  template: `
    <div class="beauty-app prov-shell">
      <app-prov-sub-header back="Dashboard" title="Services"
                           (backClick)="emit(links['business_home'])">
        <app-prov-btn slot="right" variant="primary" size="sm"
                      (clicked)="emit(links['add'])"
                      [disabled]="!links['add']">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add service
        </app-prov-btn>
      </app-prov-sub-header>

      <main id="main" class="prov-body">
        <ng-container *ngIf="services.length; else emptyState">
          <div class="list-head">
            <span class="count-eyebrow">{{ services.length }} {{ services.length === 1 ? 'SERVICE' : 'SERVICES' }}</span>
            <span class="sort-mono">Sorted A → Z</span>
          </div>
          <app-prov-card padding="0 14px">
            <div *ngFor="let s of sortedServices; let last = last" class="svc-row" [class.last]="last">
              <div class="swatch" [style.background]="swatchBg(s.category)" aria-hidden="true"></div>
              <div class="svc-info">
                <div class="svc-name">{{ s.name }}</div>
                <div class="svc-meta">
                  <span class="cat-eyebrow">{{ s.category_label }}</span>
                  <span class="dot">·</span>
                  <span class="mono">{{ s.duration_minutes }} min</span>
                  <span class="dot">·</span>
                  <span class="mono price">\${{ formatPrice(s) }}</span>
                </div>
              </div>
              <div class="svc-actions">
                <app-prov-btn variant="secondary" size="sm" (clicked)="emit(s._links?.['edit'])">
                  Edit
                </app-prov-btn>
                <app-prov-btn variant="dangerOutline" size="sm" (clicked)="askDelete(s)"
                              [disabled]="busyId === s.id">
                  Delete
                </app-prov-btn>
              </div>
            </div>
          </app-prov-card>
          <div class="list-foot">Tap any service to edit. Customers see all services on your storefront.</div>
        </ng-container>

        <ng-template #emptyState>
          <app-prov-empty-hint
            title="No services yet"
            body="Add your first service so customers can book. You can edit price, duration, and description anytime.">
            <app-prov-btn variant="primary" (clicked)="emit(links['add'])"
                          [disabled]="!links['add']">
              + Add your first service
            </app-prov-btn>
          </app-prov-empty-hint>
        </ng-template>

        <p *ngIf="errorMsg" class="server-error" role="alert" aria-live="assertive">{{ errorMsg }}</p>
      </main>

      <app-prov-tab-bar active="services" [badges]="tabBadges" (tabClick)="onTab($event)"></app-prov-tab-bar>

      <app-beauty-confirm-modal
        *ngIf="pendingDelete"
        [open]="!!pendingDelete"
        [title]="'Delete this service?'"
        [body]="confirmBody"
        [primaryLabel]="'Yes, delete'"
        [secondaryLabel]="'Keep service'"
        [primaryVariant]="'danger'"
        [busy]="busyId !== null"
        [busyLabel]="'Removing…'"
        (confirmed)="confirmDelete()"
        (dismissed)="pendingDelete = null"
      />
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --danger: #C0392B;
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
      background: var(--surface);
      color: var(--text);
      font-family: var(--font-body);
    }
    .prov-body {
      flex: 1;
      padding: 14px 16px;
      overflow-y: auto;
    }
    .list-head {
      display: flex; justify-content: space-between; align-items: baseline;
      margin-bottom: 8px;
    }
    .count-eyebrow {
      font-size: 11px; font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.6px; text-transform: uppercase;
    }
    .sort-mono {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
    }
    .svc-row {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 0;
      border-bottom: 1px solid var(--line);
    }
    .svc-row.last { border-bottom: none; }
    .swatch {
      width: 44px; height: 44px;
      border-radius: 10px;
      flex-shrink: 0;
      border: 1px solid var(--line);
    }
    .svc-info { flex: 1; min-width: 0; }
    .svc-name {
      font-family: var(--font-display);
      font-size: 17px; font-weight: 500;
      color: var(--text);
      line-height: 1.2;
    }
    .svc-meta {
      display: flex; align-items: center; gap: 6px;
      margin-top: 4px;
      flex-wrap: wrap;
    }
    .cat-eyebrow {
      font-size: 9px; font-weight: 700;
      color: var(--accent-blue-deep);
      letter-spacing: 1.2px; text-transform: uppercase;
    }
    .dot { color: var(--line); }
    .mono {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
    }
    .mono.price { font-weight: 700; color: var(--text); }
    .svc-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .list-foot {
      margin-top: 14px;
      font-size: 11px;
      color: var(--text-muted);
      text-align: center;
    }
    .server-error {
      color: var(--danger);
      padding: 12px 0;
      font-size: 13px;
    }
    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
  `],
})
export class BeautyBusinessServicesComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  busyId: number | null = null;
  errorMsg = '';
  pendingDelete: ServiceRow | null = null;

  constructor(private authService: BeautyAuthService) {}

  get services(): ServiceRow[] {
    return (this.data['services'] as ServiceRow[]) || [];
  }

  get sortedServices(): ServiceRow[] {
    return [...this.services].sort((a, b) => a.name.localeCompare(b.name));
  }

  get tabBadges(): { bookings?: number; messages?: number } {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  get confirmBody(): string {
    if (!this.pendingDelete) return '';
    return `Removing '${this.pendingDelete.name}' won't refund existing bookings, but customers won't be able to book it going forward.`;
  }

  swatchBg(category: string): string {
    const hue = CATEGORY_HUE[category] || '#7A8B6E';
    return `repeating-linear-gradient(135deg, ${hue}1a 0, ${hue}1a 6px, ${hue}26 6px, ${hue}26 12px), ${hue}33`;
  }

  formatPrice(s: ServiceRow): string {
    if (s.price_dollars) return s.price_dollars;
    return ((s.price_cents || 0) / 100).toFixed(2);
  }

  askDelete(s: ServiceRow): void {
    if (this.busyId != null) return;
    this.pendingDelete = s;
  }

  confirmDelete(): void {
    const target = this.pendingDelete;
    if (!target) return;
    this.del(target);
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  onTab(tab: ProviderTab): void {
    this.emit(resolveTabLink(tab, this.links, 'services'));
  }

  del(s: ServiceRow): void {
    const link = s._links?.['delete'];
    if (!link || this.busyId != null) return;
    this.busyId = s.id;
    this.errorMsg = '';
    this.authService.follow(link).subscribe({
      next: () => {
        this.busyId = null;
        this.pendingDelete = null;
        const self = this.links['self'];
        if (self) this.followLink.emit(self);
      },
      error: (err) => {
        this.busyId = null;
        this.pendingDelete = null;
        this.errorMsg = err?.error?.detail || 'Could not delete that service.';
      },
    });
  }
}
