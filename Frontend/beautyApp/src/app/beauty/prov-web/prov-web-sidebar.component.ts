/**
 * BeautyProvWebSidebarComponent — shared desktop sidebar for the Business
 * Provider Portal (web). Per `web-chrome.jsx` WebSidebar + `web-provider-pages.jsx`
 * PROV_NAV_ITEMS. 240px rail: Beauty wordmark + "Business Portal" pill, nav
 * (Dashboard · Bookings · Services · Weekly hours · Messages · — Account —
 * Profile · Settings) with left baby-blue active accent + unread badges,
 * footer avatar + name + email + "Storefront live".
 *
 * Emits a NAV BffLink via (follow); the shell handles routing. Replaces the
 * mobile `prov-tab-bar` on desktop. Collapses to a top hamburger under 960px
 * (handled by the consuming page's layout / global styles).
 */
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from '../beauty-bff.types';

export type ProvWebNav =
  | 'dashboard' | 'bookings' | 'services' | 'hours'
  | 'messages' | 'profile' | 'settings';

interface NavDef {
  id: ProvWebNav;
  label: string;
  screen: string;
  route: string;
}

const NAV: NavDef[] = [
  { id: 'dashboard', label: 'Dashboard',    screen: 'beauty_business_home',         route: '/business' },
  { id: 'bookings',  label: 'Bookings',     screen: 'beauty_business_bookings',     route: '/business/bookings' },
  { id: 'services',  label: 'Services',     screen: 'beauty_business_services',     route: '/business/services' },
  { id: 'hours',     label: 'Weekly hours', screen: 'beauty_business_availability', route: '/business/availability' },
  { id: 'messages',  label: 'Messages',     screen: 'beauty_business_messages',     route: '/business/messages' },
  { id: 'profile',   label: 'Profile',      screen: 'beauty_business_profile',      route: '/business/profile' },
  { id: 'settings',  label: 'Settings',     screen: 'beauty_business_settings',     route: '/business/settings' },
];

@Component({
  selector: 'app-prov-web-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="pw-sidebar">
      <button type="button" class="pw-brandbtn" (click)="go(navById('dashboard'))" aria-label="Beauty — dashboard">
        <span class="pw-brand-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/></svg>
        </span>
        <span class="pw-brand">Beauty</span>
        <span class="pw-badge">Business Portal</span>
      </button>

      <nav class="pw-nav" aria-label="Primary">
        <ng-container *ngFor="let item of topNav">
          <a class="pw-nav-item" [class.is-active]="item.id === active"
             [attr.aria-current]="item.id === active ? 'page' : null"
             (click)="go(item)" tabindex="0" role="link">
            <span class="pw-active-bar" *ngIf="item.id === active" aria-hidden="true"></span>
            <span class="pw-ico" aria-hidden="true" [innerHTML]="icon(item.id)"></span>
            <span class="pw-label">{{ item.label }}</span>
            <span class="pw-nav-badge" *ngIf="badgeFor(item.id)">{{ badgeFor(item.id) }}</span>
          </a>
        </ng-container>

        <div class="pw-section">Account</div>
        <ng-container *ngFor="let item of accountNav">
          <a class="pw-nav-item" [class.is-active]="item.id === active"
             [attr.aria-current]="item.id === active ? 'page' : null"
             (click)="go(item)" tabindex="0" role="link">
            <span class="pw-active-bar" *ngIf="item.id === active" aria-hidden="true"></span>
            <span class="pw-ico" aria-hidden="true" [innerHTML]="icon(item.id)"></span>
            <span class="pw-label">{{ item.label }}</span>
          </a>
        </ng-container>
      </nav>

      <div class="pw-foot">
        <div class="pw-foot-id">
          <span class="pw-avatar" aria-hidden="true">{{ initial }}</span>
          <span class="pw-foot-text">
            <span class="pw-foot-name">{{ businessName }}</span>
            <span class="pw-foot-email">{{ email }}</span>
          </span>
        </div>
        <div class="pw-live" *ngIf="storefrontLive">
          <span class="pw-live-dot" aria-hidden="true"></span> Storefront live
        </div>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --ink: #0A0A0B; --success: #2F7A47; --success-soft: #E5F3EA; --surface: #F2F2F2;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; height: 100%;
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .pw-sidebar {
      width: 240px; height: 100%; flex-shrink: 0;
      background: #fff; border-right: 1px solid var(--line);
      display: flex; flex-direction: column; font-family: var(--font-body);
    }
    .pw-brandbtn {
      height: 64px; padding: 0 18px; flex-shrink: 0;
      display: flex; align-items: center; gap: 10px;
      border: none; border-bottom: 1px solid var(--line); background: #fff;
      cursor: pointer; color: var(--text); width: 100%;
    }
    .pw-brand-icon {
      width: 26px; height: 26px; border-radius: 8px; background: var(--ink);
      display: grid; place-items: center; flex-shrink: 0;
    }
    .pw-brand { font-family: var(--font-display); font-size: 1.4rem; font-weight: 500; }
    .pw-badge {
      font-size: 0.5rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
      color: var(--accent-blue-text); background: var(--accent-blue);
      padding: 3px 6px; border-radius: 999px; border: 1px solid rgba(125,168,207,0.35);
      white-space: nowrap;
    }

    .pw-nav { flex: 1; padding: 12px 10px; overflow-y: auto; }
    .pw-section {
      font-size: 0.5625rem; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase;
      color: var(--text-muted); padding: 14px 12px 6px;
    }
    .pw-nav-item {
      display: flex; align-items: center; gap: 12px; position: relative;
      padding: 10px 12px; border-radius: 10px; margin-bottom: 2px;
      color: var(--text); cursor: pointer; text-decoration: none;
    }
    .pw-nav-item:hover { background: var(--surface); }
    .pw-nav-item.is-active { background: var(--surface); font-weight: 600; }
    .pw-active-bar {
      position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px;
      background: var(--accent-blue-deep); border-radius: 2px;
    }
    .pw-ico { display: inline-flex; color: var(--text-muted); flex-shrink: 0; }
    .pw-nav-item.is-active .pw-ico { color: var(--text); }
    .pw-label { font-size: 0.8125rem; letter-spacing: 0.1px; }
    .pw-nav-badge {
      margin-left: auto; min-width: 16px; height: 16px; padding: 0 4px;
      border-radius: 999px; background: var(--danger, #C0392B); color: #fff;
      font-size: 0.5625rem; font-weight: 700; line-height: 16px; text-align: center;
    }

    .pw-foot { padding: 12px; border-top: 1px solid var(--line); }
    .pw-foot-id { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .pw-avatar {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #C8A57E, #6B4F3A); color: #fff;
      display: grid; place-items: center; font-size: 0.8125rem; font-weight: 700;
    }
    .pw-foot-text { min-width: 0; }
    .pw-foot-name { display: block; font-size: 0.8125rem; font-weight: 600; }
    .pw-foot-email {
      display: block; font-family: var(--font-mono); font-size: 0.625rem; color: var(--text-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .pw-live {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--success-soft); color: var(--success);
      border-radius: 999px; padding: 4px 10px;
      font-size: 0.625rem; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase;
    }
    .pw-live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); }
  `],
})
export class BeautyProvWebSidebarComponent {
  @Input() active: ProvWebNav = 'dashboard';
  @Input() businessName = 'Your storefront';
  @Input() email = '';
  @Input() storefrontLive = true;
  /** Unread badges keyed by nav id (e.g. { bookings: 3, messages: 2 }). */
  @Input() badges: Partial<Record<ProvWebNav, number>> = {};
  @Output() follow = new EventEmitter<BffLink>();

  readonly topNav = NAV.filter((n) => n.id !== 'profile' && n.id !== 'settings');
  readonly accountNav = NAV.filter((n) => n.id === 'profile' || n.id === 'settings');

  get initial(): string {
    return (this.businessName || '·').trim()[0]?.toUpperCase() || '·';
  }

  navById(id: ProvWebNav): NavDef {
    return NAV.find((n) => n.id === id)!;
  }

  badgeFor(id: ProvWebNav): number | null {
    const v = this.badges?.[id];
    return v && v > 0 ? v : null;
  }

  go(item: NavDef): void {
    if (item.id === this.active) return;
    this.follow.emit({
      rel: item.id, href: null, method: 'NAV',
      screen: item.screen, route: item.route, prompt: item.label,
    });
  }

  icon(id: ProvWebNav): string {
    const s = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
    switch (id) {
      case 'dashboard': return `<svg ${s}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`;
      case 'bookings': return `<svg ${s}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`;
      case 'services': return `<svg ${s}><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z"/></svg>`;
      case 'hours': return `<svg ${s}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
      case 'messages': return `<svg ${s}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
      case 'profile': return `<svg ${s}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`;
      case 'settings': return `<svg ${s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 7.6 19.4l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3 12.6V12a2 2 0 0 1 4 0v.09c.7.3 1.5.12 2-.4l.06-.06A1.65 1.65 0 0 0 9.6 9.4z"/></svg>`;
      default: return '';
    }
  }
}
