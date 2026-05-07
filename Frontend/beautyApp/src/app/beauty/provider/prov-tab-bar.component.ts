import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProviderTab = 'dashboard' | 'bookings' | 'services' | 'messages' | 'profile';

@Component({
  selector: 'app-prov-tab-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="prov-tab-bar" aria-label="Provider primary navigation">
      <button type="button" class="tab" [class.active]="active === 'dashboard'"
              (click)="select('dashboard')">
        <span class="dot" *ngIf="active === 'dashboard'" aria-hidden="true"></span>
        <span class="icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="9" rx="1.5"/>
            <rect x="14" y="3" width="7" height="5" rx="1.5"/>
            <rect x="3" y="16" width="7" height="5" rx="1.5"/>
            <rect x="14" y="12" width="7" height="9" rx="1.5"/>
          </svg>
        </span>
        <span class="label">Dashboard</span>
      </button>

      <button type="button" class="tab" [class.active]="active === 'bookings'"
              (click)="select('bookings')">
        <span class="dot" *ngIf="active === 'bookings'" aria-hidden="true"></span>
        <span class="icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2.5"/>
            <path d="M3 10h18M8 3v4M16 3v4"/>
          </svg>
          <span class="badge" *ngIf="badges?.bookings && (badges?.bookings ?? 0) > 0">{{ badges?.bookings }}</span>
        </span>
        <span class="label">Bookings</span>
      </button>

      <button type="button" class="tab" [class.active]="active === 'services'"
              (click)="select('services')">
        <span class="dot" *ngIf="active === 'services'" aria-hidden="true"></span>
        <span class="icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z"/>
            <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/>
          </svg>
        </span>
        <span class="label">Services</span>
      </button>

      <button type="button" class="tab" [class.active]="active === 'messages'"
              (click)="select('messages')">
        <span class="dot" *ngIf="active === 'messages'" aria-hidden="true"></span>
        <span class="icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>
          </svg>
          <span class="badge" *ngIf="badges?.messages && (badges?.messages ?? 0) > 0">{{ badges?.messages }}</span>
        </span>
        <span class="label">Messages</span>
      </button>

      <button type="button" class="tab" [class.active]="active === 'profile'"
              (click)="select('profile')">
        <span class="dot" *ngIf="active === 'profile'" aria-hidden="true"></span>
        <span class="icon-wrap">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.8"/>
            <path d="M4.5 21c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5"/>
          </svg>
        </span>
        <span class="label">Profile</span>
      </button>
    </nav>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115;
      --accent-blue-deep: #7DA8CF;
      --font-body: 'Inter', system-ui, sans-serif;
      display: block;
      flex-shrink: 0;
      background: var(--surface);
      padding-bottom: env(safe-area-inset-bottom);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .prov-tab-bar {
      display: flex;
      background: #FFFFFF;
      box-shadow: 0 -2px 14px rgba(15, 35, 60, 0.08);
      border-top: 1px solid var(--line);
      overflow: visible;
    }
    .tab {
      flex: 1;
      height: 64px;
      min-height: 64px;
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 4px;
      padding: 0;
      position: relative;
      font-family: var(--font-body);
      color: var(--text);
    }
    .tab.active { color: var(--accent-blue-deep); }
    .dot {
      position: absolute;
      top: -4px;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--accent-blue-deep);
    }
    .icon-wrap { position: relative; display: inline-flex; }
    .badge {
      position: absolute;
      top: -2px; right: -6px;
      min-width: 16px; height: 16px;
      padding: 0 4px;
      border-radius: 999px;
      background: #C0392B; color: #fff;
      font-size: 10px; font-weight: 700; line-height: 16px;
      text-align: center;
      border: 1.5px solid #fff;
    }
    .label {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.1px;
      line-height: 1;
    }
    .tab.active .label { font-weight: 600; }
  `],
})
export class BeautyProviderTabBarComponent {
  @Input() active: ProviderTab = 'dashboard';
  @Input() badges: { bookings?: number; messages?: number } | null = null;
  @Output() tabClick = new EventEmitter<ProviderTab>();

  select(tab: ProviderTab) { this.tabClick.emit(tab); }
}
