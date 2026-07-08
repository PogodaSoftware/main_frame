/**
 * AdminPortalBookingDetailComponent — `/admin/portal/bookings/:id`
 *
 * Admin booking drill-down (opened from the bookings ledger and from a
 * customer/provider's bookings list). Desktop redesign on the shared admin-web
 * chrome — there is no dedicated design artboard for this drill-down, so it
 * follows the established admin-web system (slate chrome + page header + cards,
 * Cormorant titles, mono for IDs/prices/times).
 *
 * Stays entirely inside the admin surface: the customer/provider cards follow
 * BFF links to the admin customer/provider detail screens, never the
 * customer- or business-facing booking screens. Mirrors the RN admin booking
 * detail. @Input/@Output contract unchanged.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from '../beauty-bff.types';
import { BeautyAdminWebSidebarComponent } from '../admin-web/admin-web-sidebar.component';
import { BeautyAdminWebTopbarComponent } from '../admin-web/admin-web-topbar.component';
import { BeautyAdminWebSessionBarComponent } from '../admin-web/admin-web-session-bar.component';
import { BeautyAdminWebPageHeaderComponent } from '../admin-web/admin-web-page-header.component';

interface Party { id: number | null; name: string; email?: string; }

@Component({
  selector: 'app-admin-portal-booking-detail',
  standalone: true,
  imports: [
    CommonModule,
    BeautyAdminWebSidebarComponent,
    BeautyAdminWebTopbarComponent,
    BeautyAdminWebSessionBarComponent,
    BeautyAdminWebPageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-web aw-shell">
      <app-admin-web-sidebar active="bookings"
        [adminName]="adminName" [adminEmail]="adminEmail" [badges]="navBadges"
        (follow)="followLink.emit($event)"></app-admin-web-sidebar>

      <div class="aw-col">
        <app-admin-web-topbar [notifCount]="notifCount" [adminName]="adminName" [adminEmail]="adminEmail"
          (follow)="followLink.emit($event)"></app-admin-web-topbar>
        <app-admin-web-session-bar [sessionRemaining]="sessionRemaining"
          (follow)="followLink.emit($event)"></app-admin-web-session-bar>

        <main class="aw-main" role="main">
          <app-admin-web-page-header
            [breadcrumb]="['Bookings ledger', confirmation]"
            [title]="service"
            [sub]="slotLabel">
            <div slot="actions" class="aw-hactions">
              <button type="button" class="aw-btn aw-btn--sec" (click)="onBack()">Back to bookings</button>
            </div>
          </app-admin-web-page-header>

          <div class="aw-body">
            <!-- LEFT: booking summary -->
            <div class="aw-rail">
              <div class="aw-card aw-card--pad">
                <div class="aw-eyebrow">Confirmation</div>
                <div class="mono aw-conf">{{ confirmation }}</div>
                <div class="aw-chips">
                  <span class="aw-schip" [class.is-bad]="status !== 'Confirmed'">{{ status }}</span>
                </div>
                <div class="aw-meta">
                  <div><div class="aw-eyebrow">Price</div><div class="mono v">{{ priceLabel }}</div></div>
                  <div><div class="aw-eyebrow">Duration</div><div class="mono v">{{ durationLabel }}</div></div>
                  <div><div class="aw-eyebrow">Time</div><div class="mono v">{{ timeLabel }}</div></div>
                  <div><div class="aw-eyebrow">Booked on</div><div class="mono v">{{ bookedOnLabel }}</div></div>
                </div>
              </div>

              <div class="aw-card aw-card--pad">
                <div class="aw-eyebrow mb">Schedule</div>
                <div class="aw-sched">
                  <div class="aw-datetile mono">
                    <span class="mon">{{ dateMon }}</span>
                    <span class="day">{{ dateDay }}</span>
                    <span class="wd">{{ dateWeekday }}</span>
                  </div>
                  <div class="aw-sched-text">
                    <div class="aw-sched-svc">{{ service }}</div>
                    <div class="mono aw-sched-time">{{ slotLabel }}</div>
                  </div>
                  <div class="mono aw-sched-price">{{ priceLabel }}</div>
                </div>
              </div>
            </div>

            <!-- RIGHT: parties -->
            <div class="aw-rightcol">
              <div class="aw-card">
                <div class="aw-cardhead"><h3 class="aw-h3">Parties</h3></div>

                <button type="button" class="aw-party" (click)="openCustomer()" [disabled]="customer.id == null"
                        [attr.aria-label]="'View customer ' + customer.name">
                  <span class="aw-avatar" aria-hidden="true">{{ initialsOf(customer.name) }}</span>
                  <div class="aw-party-text">
                    <div class="aw-eyebrow">Customer</div>
                    <div class="aw-party-name">{{ customer.name }}</div>
                    <div class="mono aw-party-email" *ngIf="customer.email">{{ customer.email }}</div>
                  </div>
                  <svg *ngIf="customer.id != null" class="aw-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>

                <button type="button" class="aw-party is-border" (click)="openProvider()" [disabled]="provider.id == null"
                        [attr.aria-label]="'View provider ' + provider.name">
                  <span class="aw-avatar is-prov" aria-hidden="true">{{ initialsOf(provider.name) }}</span>
                  <div class="aw-party-text">
                    <div class="aw-eyebrow">Provider</div>
                    <div class="aw-party-name">{{ provider.name }}</div>
                  </div>
                  <svg *ngIf="provider.id != null" class="aw-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  <span *ngIf="provider.id == null" class="mono aw-muted">Not linked</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --surface: #F2F2F2; --danger: #C0392B; --admin-red: #B23A2D; --ok: #2F7A47; --slate: #0E1620;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh;
    }
    * { box-sizing: border-box; }
    .mono { font-family: var(--font-mono); }
    .mb { margin-bottom: 10px; }
    .aw-muted { color: var(--text-muted); font-size: 0.75rem; }

    .aw-shell { display: flex; width: 100%; height: 100dvh; background: var(--surface); font-family: var(--font-body); color: var(--text); overflow: hidden; }
    .aw-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .aw-main { flex: 1; overflow: auto; background: var(--surface); }
    .aw-body { padding: 20px 28px 32px; display: grid; grid-template-columns: 340px 1fr; gap: 16px; align-items: start; }

    .aw-hactions { display: flex; gap: 8px; align-items: center; }
    .aw-btn { height: 38px; padding: 0 14px; border-radius: 10px; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; cursor: pointer; line-height: 1; border: 1px solid transparent; }
    .aw-btn--sec { background: #fff; color: var(--text); border-color: var(--line); }

    .aw-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }
    .aw-card--pad { padding: 18px; }
    .aw-rail { display: flex; flex-direction: column; gap: 12px; }
    .aw-rightcol { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
    .aw-eyebrow { font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); }
    .aw-h3 { margin: 0; font-family: var(--font-display); font-size: 1.25rem; font-weight: 500; color: var(--text); line-height: 1.1; }

    .aw-conf { font-size: 1.375rem; letter-spacing: 0.5px; margin-top: 4px; }
    .aw-chips { margin: 12px 0 16px; }
    .aw-schip { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; background: #E5F3EA; color: var(--ok); }
    .aw-schip.is-bad { background: #FCE8E5; color: var(--danger); }
    .aw-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .aw-meta .v { font-size: 0.8125rem; color: var(--text); margin-top: 3px; }

    .aw-sched { display: flex; align-items: center; gap: 14px; }
    .aw-datetile { text-align: center; min-width: 48px; display: flex; flex-direction: column; }
    .aw-datetile .mon { font-size: 0.5625rem; font-weight: 700; color: var(--text-muted); letter-spacing: 0.4px; }
    .aw-datetile .day { font-size: 1.5rem; font-weight: 600; line-height: 1; }
    .aw-datetile .wd { font-size: 0.5625rem; font-weight: 600; color: var(--text-muted); letter-spacing: 0.3px; }
    .aw-sched-text { flex: 1; min-width: 0; }
    .aw-sched-svc { font-size: 0.875rem; font-weight: 600; }
    .aw-sched-time { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
    .aw-sched-price { font-size: 0.875rem; font-weight: 600; }

    .aw-cardhead { padding: 14px 16px; border-bottom: 1px solid var(--line); }
    .aw-party { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 16px; background: none; border: none; text-align: left; cursor: pointer; font-family: var(--font-body); }
    .aw-party:disabled { cursor: default; }
    .aw-party:not(:disabled):hover { background: #FAFAFA; }
    .aw-party.is-border { border-top: 1px solid var(--surface); }
    .aw-avatar { width: 40px; height: 40px; border-radius: 11px; background: var(--slate); color: #fff; display: grid; place-items: center; font-family: var(--font-display); font-size: 0.9375rem; font-weight: 600; flex-shrink: 0; }
    .aw-avatar.is-prov { background: #2A3441; }
    .aw-party-text { flex: 1; min-width: 0; }
    .aw-party-name { font-size: 0.875rem; font-weight: 600; margin-top: 2px; }
    .aw-party-email { font-size: 0.6875rem; color: var(--text-muted); margin-top: 1px; }
    .aw-chev { color: var(--text-muted); flex-shrink: 0; }

    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }
    @media screen and (max-width: 1000px) { .aw-body { grid-template-columns: 1fr; } }
  `],
})
export class AdminPortalBookingDetailComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get notifCount(): number | null { return (this.data['notif_count'] as number | null) ?? null; }
  get adminName(): string { return (this.data['first_name'] as string) || 'Maria R.'; }
  get adminEmail(): string { return (this.data['admin_email'] as string) || 'maria@beauty.io'; }
  get sessionRemaining(): string { return (this.data['session_remaining'] as string) ?? '14:32'; }
  get navBadges(): Record<string, number> {
    const badges = (this.data['tab_badges'] as Record<string, number | null>) ?? {};
    const out: Record<string, number> = {};
    if (badges['tickets']) out['tickets'] = badges['tickets'] as number;
    return out;
  }

  get confirmation(): string { return (this.data['confirmation'] as string) ?? '—'; }
  get status(): string { return (this.data['status'] as string) ?? 'Confirmed'; }
  get service(): string { return (this.data['service'] as string) ?? '—'; }
  get dateMon(): string { return (this.data['date_mon'] as string) ?? '—'; }
  get dateDay(): number { return (this.data['date_day'] as number) ?? 0; }
  get dateWeekday(): string { return (this.data['date_weekday'] as string) ?? '—'; }
  get slotLabel(): string { return (this.data['slot_label'] as string) ?? '—'; }
  get timeLabel(): string { return (this.data['time_label'] as string) ?? '—'; }
  get priceLabel(): string { return (this.data['price_label'] as string) ?? '—'; }
  get durationLabel(): string { return (this.data['duration_label'] as string) ?? '—'; }
  get bookedOnLabel(): string { return (this.data['booked_on_label'] as string) ?? '—'; }
  get customer(): Party { return (this.data['customer'] as Party) ?? { id: null, name: '—' }; }
  get provider(): Party { return (this.data['provider'] as Party) ?? { id: null, name: '—' }; }

  initialsOf(name: string): string {
    const parts = (name || '').split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return ((parts[0][0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  onBack(): void { const link = this.links['back']; if (link) this.followLink.emit(link); }
  openCustomer(): void { const link = this.links['customer_detail']; if (link) this.followLink.emit(link); }
  openProvider(): void { const link = this.links['provider_detail']; if (link) this.followLink.emit(link); }
}
