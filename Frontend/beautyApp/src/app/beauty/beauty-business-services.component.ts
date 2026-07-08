/**
 * BeautyBusinessServicesComponent — redesigned per Business Provider Portal handoff (svc-v1).
 * Sub-header + service rows in a card + delete confirm modal.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyConfirmModalComponent } from './beauty-confirm-modal.component';
import { BeautyProvWebSidebarComponent, ProvWebNav } from './prov-web/prov-web-sidebar.component';
import { BeautyProvWebTopbarComponent } from './prov-web/prov-web-topbar.component';

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
    FormsModule,
    BeautyConfirmModalComponent,
    BeautyProvWebSidebarComponent,
    BeautyProvWebTopbarComponent,
  ],
  template: `
    <div class="pw-shell">
      <app-prov-web-sidebar
        active="services"
        [businessName]="business?.business_name || 'Your storefront'"
        [email]="business?.email || ''"
        [storefrontLive]="storefrontOpen"
        [badges]="navBadges"
        (follow)="emit($event)">
      </app-prov-web-sidebar>

      <div class="pw-main">
        <app-prov-web-topbar
          [businessName]="business?.business_name || 'Your storefront'"
          [email]="business?.email || ''"
          [notifCount]="topBadge"
          (follow)="emit($event)">
        </app-prov-web-topbar>

        <main id="main" class="pw-content">
          <div class="pw-header">
            <div class="pw-header-text pw-header-centered">
              <h1 class="pw-title">Services</h1>
              <div class="pw-sub">{{ services.length }} service{{ services.length === 1 ? '' : 's' }} · across {{ categoryCount }} categor{{ categoryCount === 1 ? 'y' : 'ies' }}</div>
            </div>
            <div class="pw-header-actions">
              <label class="sort-select" *ngIf="services.length" aria-label="Sort services">
                <span class="sort-eyebrow">Sort</span>
                <select [(ngModel)]="sortKey" name="sort-key">
                  <option value="name-asc">Name A → Z</option>
                  <option value="name-desc">Name Z → A</option>
                  <option value="price-asc">Price low → high</option>
                  <option value="price-desc">Price high → low</option>
                  <option value="time-asc">Time short → long</option>
                  <option value="time-desc">Time long → short</option>
                </select>
              </label>
              <button type="button" class="wbtn wbtn-ink" (click)="emit(links['add'])" [disabled]="!links['add']">+ Add service</button>
            </div>
          </div>

          <div class="pw-pad">
            <ng-container *ngIf="services.length; else emptyState">
              <section class="web-card nopad">
                <table class="svc-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th class="col-cat">Category</th>
                      <th class="col-dur">Duration</th>
                      <th class="col-price r">Price</th>
                      <th class="col-act r">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let s of sortedServices">
                      <td>
                        <div class="svc-cell">
                          <div class="swatch" [style.background]="swatchBg(s.category)" aria-hidden="true"></div>
                          <div class="svc-info">
                            <div class="svc-name">{{ s.name }}</div>
                            <div class="svc-desc" *ngIf="s.description">{{ s.description }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="col-cat"><span class="cat-eyebrow">{{ s.category_label }}</span></td>
                      <td class="col-dur mono">{{ s.duration_minutes }} min</td>
                      <td class="col-price r mono price">\${{ formatPrice(s) }}</td>
                      <td class="col-act r">
                        <div class="row-actions">
                          <button type="button" class="wbtn wbtn-secondary sm" (click)="emit(s._links?.['edit'])">Edit</button>
                          <button type="button" class="wbtn wbtn-danger-outline sm" (click)="askDelete(s)" [disabled]="busyId === s.id">Delete</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>
            </ng-container>

            <ng-template #emptyState>
              <section class="web-card empty-card">
                <div class="empty-ico" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1a3a52" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z"/></svg>
                </div>
                <h2 class="empty-h2">No services yet</h2>
                <div class="empty-body">Customers see a service list on your storefront. Add at least one to go live.</div>
                <button type="button" class="wbtn wbtn-ink lg" (click)="emit(links['add'])" [disabled]="!links['add']">+ Add your first service</button>
              </section>
            </ng-template>

            <p *ngIf="errorMsg" class="server-error" role="alert" aria-live="assertive">{{ errorMsg }}</p>
          </div>
        </main>
      </div>

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
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --ink: #0A0A0B; --danger: #C0392B; --danger-soft: #FCE8E5;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    /* Shell */
    .pw-shell { display: flex; min-height: 100dvh; background: var(--surface); }
    app-prov-web-sidebar { position: sticky; top: 0; height: 100dvh; }
    .pw-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    app-prov-web-topbar { position: sticky; top: 0; z-index: 5; }
    .pw-content { flex: 1; padding: 0 0 40px; }
    .pw-pad { padding: 20px 28px 28px; }

    .pw-header { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 24px 28px 4px; }
    .pw-header-text { flex: 1; min-width: 0; }
    .pw-header-centered { text-align: center; }
    .pw-title { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 500; letter-spacing: 0.2px; line-height: 1.15; }
    .pw-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 6px; }
    .pw-header-actions { position: absolute; top: 24px; right: 28px; display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

    /* Buttons */
    .wbtn { height: 40px; padding: 0 16px; border-radius: 10px; cursor: pointer; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid transparent; white-space: nowrap; }
    .wbtn:disabled { opacity: 0.5; cursor: not-allowed; }
    .wbtn.sm { height: 32px; padding: 0 12px; font-size: 0.75rem; }
    .wbtn.lg { height: 48px; padding: 0 22px; font-size: 0.9375rem; }
    .wbtn-ink { background: var(--ink); color: #fff; border-color: var(--ink); }
    .wbtn-ink:hover:not(:disabled) { background: #1F1F22; }
    .wbtn-secondary { background: #fff; color: var(--text); border-color: var(--line); }
    .wbtn-secondary:hover:not(:disabled) { border-color: var(--accent-blue-deep); }
    .wbtn-danger-outline { background: #fff; color: var(--danger); border-color: rgba(192,57,43,0.4); }
    .wbtn-danger-outline:hover:not(:disabled) { background: var(--danger-soft); }

    .sort-select { display: inline-flex; align-items: center; gap: 6px; font-size: 0.6875rem; color: var(--text-muted); }
    .sort-eyebrow { font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; }
    .sort-select select { font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; color: var(--text); background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 0 10px; height: 40px; cursor: pointer; }

    .web-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }
    .web-card.nopad { overflow: hidden; }

    /* Services table */
    .svc-table { width: 100%; border-collapse: collapse; }
    .svc-table thead tr { background: var(--surface); border-bottom: 1px solid var(--line); }
    .svc-table th {
      padding: 12px 16px; font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px;
      text-transform: uppercase; color: var(--text-muted); text-align: left;
    }
    .svc-table th.r, .svc-table td.r { text-align: right; }
    .col-cat { width: 140px; } .col-dur { width: 110px; } .col-price { width: 120px; } .col-act { width: 200px; }
    .svc-table tbody tr { border-top: 1px solid var(--surface); }
    .svc-table tbody tr:first-child { border-top: none; }
    .svc-table td { padding: 14px 16px; vertical-align: middle; }
    .svc-cell { display: flex; align-items: center; gap: 14px; }
    .swatch { width: 48px; height: 48px; border-radius: 10px; flex-shrink: 0; border: 1px solid var(--line); }
    .svc-info { min-width: 0; }
    .svc-name { font-family: var(--font-display); font-size: 1.125rem; font-weight: 500; }
    .svc-desc { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 340px; }
    .cat-eyebrow { font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--accent-blue-deep); }
    .mono { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text); }
    .mono.price { font-weight: 600; }
    .row-actions { display: inline-flex; gap: 6px; }

    /* Empty */
    .empty-card { padding: 56px; text-align: center; }
    .empty-ico { width: 64px; height: 64px; border-radius: 16px; background: var(--accent-blue); margin: 0 auto 18px; display: grid; place-items: center; }
    .empty-h2 { margin: 0; font-family: var(--font-display); font-size: 1.75rem; font-weight: 500; }
    .empty-body { font-size: 0.875rem; color: var(--text-muted); margin: 8px auto 24px; line-height: 1.55; max-width: 420px; }

    .server-error { color: var(--danger); padding: 12px 0; font-size: 0.8125rem; }

    @media screen and (max-width: 720px) {
      app-prov-web-sidebar { display: none; }
      .pw-header { flex-direction: column; padding: 16px; }
      .pw-pad { padding: 16px; }
      .col-cat, .col-dur { display: none; }
      .svc-desc { display: none; }
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
  sortKey: 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'time-asc' | 'time-desc' = 'name-asc';

  constructor(private authService: BeautyAuthService) {}

  get services(): ServiceRow[] {
    return (this.data['services'] as ServiceRow[]) || [];
  }

  get sortedServices(): ServiceRow[] {
    const list = [...this.services];
    const cents = (s: ServiceRow) => s.price_dollars ? Math.round(parseFloat(s.price_dollars) * 100) : (s.price_cents || 0);
    switch (this.sortKey) {
      case 'name-desc':  return list.sort((a, b) => b.name.localeCompare(a.name));
      case 'price-asc':  return list.sort((a, b) => cents(a) - cents(b));
      case 'price-desc': return list.sort((a, b) => cents(b) - cents(a));
      case 'time-asc':   return list.sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
      case 'time-desc':  return list.sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0));
      case 'name-asc':
      default:           return list.sort((a, b) => a.name.localeCompare(b.name));
    }
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

  get business(): { email?: string; business_name?: string } | null {
    return (this.data['business'] as { email?: string; business_name?: string }) || null;
  }
  get storefrontOpen(): boolean {
    const sf = (this.data['storefront'] as { is_open?: boolean }) || {};
    return sf.is_open !== false;
  }
  get topBadge(): number | null {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    const t = (b.messages_unread || 0) + (b.bookings_unread || 0);
    return t > 0 ? t : null;
  }
  get navBadges(): Partial<Record<ProvWebNav, number>> {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }
  get categoryCount(): number {
    return new Set(this.services.map((s) => s.category)).size;
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
