/**
 * AdminPortalBookingDetailComponent — `/admin/portal/bookings/:id`
 *
 * Admin-only booking drill-down from the bookings ledger. Stays entirely
 * within the admin surface: the customer/provider rows follow BFF links to
 * the admin customer / provider detail screens — never the customer- or
 * business-facing booking screens. Mirrors the RN admin booking detail.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from '../beauty-bff.types';
import {
  AdmStatusBarComponent,
  AdmHomeIndicatorComponent,
  AdmTopHeaderComponent,
  AdmTabBarComponent,
  AdmStatusChipComponent,
  AdmAvatarComponent,
  AdmCardComponent,
} from './atoms';

interface Party { id: number | null; name: string; email?: string; }

@Component({
  selector: 'app-admin-portal-booking-detail',
  standalone: true,
  imports: [
    CommonModule,
    AdmStatusBarComponent, AdmHomeIndicatorComponent,
    AdmTopHeaderComponent, AdmTabBarComponent,
    AdmStatusChipComponent, AdmAvatarComponent, AdmCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-app is-light adm-bkd">
      <adm-status-bar tone="slate"></adm-status-bar>
      <adm-top-header [notifCount]="notifCount" [initials]="adminInitials"></adm-top-header>

      <main class="body adm-body--scroll" role="main">
        <!-- Slate hero -->
        <section class="hero">
          <button type="button" class="back" (click)="onBack()" aria-label="Back to bookings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            <span>Bookings</span>
          </button>

          <h1 class="conf adm-mono">{{ confirmation }}</h1>
          <div class="service adm-display">{{ service }}</div>
          <div class="status-row">
            <adm-status-chip [status]="$any(status)"></adm-status-chip>
            <span class="slot adm-mono">{{ slotLabel }}</span>
          </div>

          <div class="meta-grid">
            <div class="cell"><div class="eyebrow">Price</div><div class="val adm-mono">{{ priceLabel }}</div></div>
            <div class="cell"><div class="eyebrow">Duration</div><div class="val adm-mono">{{ durationLabel }}</div></div>
            <div class="cell"><div class="eyebrow">Booked on</div><div class="val adm-mono">{{ bookedOnLabel }}</div></div>
            <div class="cell"><div class="eyebrow">Booking ID</div><div class="val adm-mono">{{ confirmation }}</div></div>
          </div>
        </section>

        <div class="content">
          <!-- Parties -->
          <section class="sec">
            <h2 class="sec-title adm-display">Parties</h2>
            <adm-card [padding]="0">
              <button type="button" class="party" (click)="openCustomer()"
                      [disabled]="customer.id == null" [attr.aria-label]="'View customer ' + customer.name">
                <adm-avatar [initials]="initialsOf(customer.name)" [size]="38" kind="customer"></adm-avatar>
                <div class="party-text">
                  <div class="party-eyebrow">Customer</div>
                  <div class="party-name">{{ customer.name }}</div>
                  <div class="party-email adm-mono" *ngIf="customer.email">{{ customer.email }}</div>
                </div>
                <svg *ngIf="customer.id != null" class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <button type="button" class="party party--border" (click)="openProvider()"
                      [disabled]="provider.id == null" [attr.aria-label]="'View provider ' + provider.name">
                <adm-avatar [initials]="initialsOf(provider.name)" [size]="38" kind="provider"></adm-avatar>
                <div class="party-text">
                  <div class="party-eyebrow">Provider</div>
                  <div class="party-name">{{ provider.name }}</div>
                </div>
                <svg *ngIf="provider.id != null" class="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                <span *ngIf="provider.id == null" class="muted adm-mono">Not linked</span>
              </button>
            </adm-card>
          </section>

          <!-- Schedule -->
          <section class="sec">
            <h2 class="sec-title adm-display">Schedule</h2>
            <adm-card [padding]="0">
              <div class="sched">
                <div class="bk-date adm-mono">
                  <div class="mon">{{ dateMon }}</div>
                  <div class="day">{{ dateDay }}</div>
                  <div class="wd">{{ dateWeekday }}</div>
                </div>
                <div class="sched-text">
                  <div class="sched-service">{{ service }}</div>
                  <div class="sched-time adm-mono">{{ slotLabel }}</div>
                </div>
                <div class="sched-price adm-mono">{{ priceLabel }}</div>
              </div>
            </adm-card>
          </section>
        </div>
      </main>

      <adm-tab-bar active="bookings" [badges]="tabBadges" (select)="onTab($event)"></adm-tab-bar>
      <adm-home-indicator tone="slate"></adm-home-indicator>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--surface); }
    .adm-bkd { min-height: 100dvh; }
    .body { padding: 0 0 24px; }

    .hero { background: var(--adm-slate); color: #fff; padding: 0 14px 16px; }
    .back { display: inline-flex; align-items: center; gap: 4px; height: 48px; background: none; border: none; color: var(--adm-slate-muted); font-family: var(--adm-font-body); font-size: 12px; font-weight: 500; cursor: pointer; padding: 0; }
    .conf { margin: 0; font-size: 24px; letter-spacing: 0.5px; color: #fff; }
    .service { font-size: 15px; margin-top: 6px; color: #fff; }
    .status-row { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .slot { font-size: 11px; color: var(--adm-slate-muted); }
    .meta-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
    .meta-grid .cell { width: calc(50% - 5px); }
    .eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--adm-slate-muted); }
    .val { color: #fff; font-size: 12px; margin-top: 3px; }

    .content { padding: 14px; }
    .sec { margin-bottom: 14px; }
    .sec-title { margin: 0 0 8px; font-size: 18px; color: var(--text); }

    .party { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; background: none; border: none; text-align: left; cursor: pointer; }
    .party:disabled { cursor: default; }
    .party:not(:disabled):hover { background: var(--surface); }
    .party--border { border-top: 1px solid #ECECEE; }
    .party-text { flex: 1; min-width: 0; }
    .party-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); }
    .party-name { font-size: 13.5px; font-weight: 600; color: var(--text); margin-top: 2px; }
    .party-email { font-size: 10.5px; color: var(--text-muted); margin-top: 1px; }
    .chev { color: var(--text-muted); flex-shrink: 0; }
    .muted { font-size: 10.5px; color: var(--text-muted); }

    .sched { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
    .bk-date { text-align: center; min-width: 40px; flex-shrink: 0; }
    .bk-date .mon { font-size: 8.5px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.4px; }
    .bk-date .day { font-size: 20px; font-weight: 600; color: var(--text); line-height: 1; }
    .bk-date .wd { font-size: 8.5px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.3px; }
    .sched-text { flex: 1; min-width: 0; }
    .sched-service { font-size: 12.5px; color: var(--text); font-weight: 600; }
    .sched-time { font-size: 10.5px; color: var(--text-muted); margin-top: 2px; }
    .sched-price { font-size: 12.5px; font-weight: 600; color: var(--text); }
  `],
})
export class AdminPortalBookingDetailComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get notifCount(): number { return (this.data['notif_count'] as number) ?? 0; }
  get adminInitials(): string { return (this.data['admin_initials'] as string) ?? 'AD'; }
  get confirmation(): string { return (this.data['confirmation'] as string) ?? '—'; }
  get status(): string { return (this.data['status'] as string) ?? 'Confirmed'; }
  get service(): string { return (this.data['service'] as string) ?? '—'; }
  get dateMon(): string { return (this.data['date_mon'] as string) ?? '—'; }
  get dateDay(): number { return (this.data['date_day'] as number) ?? 0; }
  get dateWeekday(): string { return (this.data['date_weekday'] as string) ?? '—'; }
  get slotLabel(): string { return (this.data['slot_label'] as string) ?? '—'; }
  get priceLabel(): string { return (this.data['price_label'] as string) ?? '—'; }
  get durationLabel(): string { return (this.data['duration_label'] as string) ?? '—'; }
  get bookedOnLabel(): string { return (this.data['booked_on_label'] as string) ?? '—'; }
  get customer(): Party { return (this.data['customer'] as Party) ?? { id: null, name: '—' }; }
  get provider(): Party { return (this.data['provider'] as Party) ?? { id: null, name: '—' }; }
  get tabBadges(): Record<string, number | string | null> {
    return (this.data['tab_badges'] as Record<string, number | string | null>) ?? {};
  }

  initialsOf(name: string): string {
    const parts = (name || '').split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return ((parts[0][0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  onBack(): void {
    const link = this.links['back'];
    if (link) this.followLink.emit(link);
  }

  openCustomer(): void {
    const link = this.links['customer_detail'];
    if (link) this.followLink.emit(link);
  }

  openProvider(): void {
    const link = this.links['provider_detail'];
    if (link) this.followLink.emit(link);
  }

  onTab(kind: string): void {
    const link = this.links[kind];
    if (link) this.followLink.emit(link);
  }
}
