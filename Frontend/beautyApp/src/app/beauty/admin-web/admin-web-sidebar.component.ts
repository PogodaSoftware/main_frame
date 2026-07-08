/**
 * BeautyAdminWebSidebarComponent — shared desktop sidebar for the Admin Portal
 * (web). Mirrors `prov-web/prov-web-sidebar.component.ts` but uses the slate
 * palette (#0E1620) + ADMIN-red active accent (#B23A2D), per `web-admin-pages.jsx`
 * AdminWebShell + ADMIN_NAV_ITEMS.
 *
 * 240px slate rail: Beauty wordmark + ADMIN-red badge, grouped nav
 * (Dashboard · — Accounts — Customers, Providers, Bookings ledger ·
 * — Operations — Support tickets [badge], Audit log · — Administration —
 * Team & access, Settings). Footer: avatar + "Maria R." + mono email + cog.
 *
 * Emits a NAV BffLink via (follow); the shell routes it. RN remains the mobile
 * shell and is never edited.
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

export type AdminWebNav =
  | 'dashboard' | 'crm-customers' | 'crm-providers' | 'bookings'
  | 'tickets' | 'audit' | 'team' | 'settings' | 'flags';

interface AdminNavDef {
  id: AdminWebNav;
  label: string;
  screen: string;
  route: string;
  icon: string;
}

interface AdminNavGroup {
  section: string | null;
  items: AdminNavDef[];
}

const ICON = (paths: string) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const NAV_GROUPS: AdminNavGroup[] = [
  {
    section: null,
    items: [
      { id: 'dashboard', label: 'Dashboard', screen: 'beauty_admin_portal_dashboard', route: '/admin/portal/dashboard',
        icon: ICON('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/>') },
    ],
  },
  {
    section: 'Accounts',
    items: [
      { id: 'crm-customers', label: 'Customers', screen: 'beauty_admin_portal_crm', route: '/admin/portal/crm',
        icon: ICON('<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 21c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5"/>') },
      { id: 'crm-providers', label: 'Providers', screen: 'beauty_admin_portal_crm', route: '/admin/portal/crm?type=providers',
        icon: ICON('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>') },
      { id: 'bookings', label: 'Bookings ledger', screen: 'beauty_admin_portal_bookings', route: '/admin/portal/bookings',
        icon: ICON('<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>') },
    ],
  },
  {
    section: 'Operations',
    items: [
      { id: 'tickets', label: 'Support tickets', screen: 'beauty_admin_portal_tickets', route: '/admin/portal/tickets',
        icon: ICON('<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z"/><path d="M10 6v12" stroke-dasharray="2 2"/>') },
      { id: 'audit', label: 'Audit log', screen: 'beauty_admin_portal_audit', route: '/admin/portal/audit',
        icon: ICON('<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2.5"/>') },
    ],
  },
  {
    section: 'Administration',
    items: [
      { id: 'team', label: 'Team & access', screen: 'beauty_admin_portal_team', route: '/admin/portal/team',
        icon: ICON('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>') },
      { id: 'flags', label: 'Feature flags', screen: 'beauty_admin_flags', route: '/admin/flags',
        icon: ICON('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>') },
      { id: 'settings', label: 'Settings', screen: 'beauty_admin_portal_team', route: '/admin/portal/team',
        icon: ICON('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>') },
    ],
  },
];

@Component({
  selector: 'app-admin-web-sidebar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="aws-sidebar">
      <button type="button" class="aws-brandbtn" (click)="goId('dashboard')" aria-label="Beauty Admin — dashboard">
        <span class="aws-mark" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/>
          </svg>
        </span>
        <span class="aws-brand">Beauty</span>
        <span class="aws-badge">Admin</span>
      </button>

      <nav class="aws-nav" aria-label="Primary">
        <ng-container *ngFor="let group of groups">
          <div class="aws-section" *ngIf="group.section">{{ group.section }}</div>
          <a class="aws-item" *ngFor="let item of group.items"
             [class.is-active]="item.id === active"
             [attr.aria-current]="item.id === active ? 'page' : null"
             (click)="go(item)" (keydown.enter)="go(item)" tabindex="0" role="link"
             [attr.title]="item.label">
            <span class="aws-bar" *ngIf="item.id === active" aria-hidden="true"></span>
            <span class="aws-ico" aria-hidden="true">
              <span [innerHTML]="item.icon"></span>
              <span class="aws-ico-badge" *ngIf="badgeFor(item.id)">{{ badgeFor(item.id) }}</span>
            </span>
            <span class="aws-label">{{ item.label }}</span>
          </a>
        </ng-container>
      </nav>

      <div class="aws-foot">
        <span class="aws-avatar" aria-hidden="true">{{ initials }}</span>
        <span class="aws-foot-text">
          <span class="aws-foot-name">{{ adminName }}</span>
          <span class="aws-foot-email">{{ adminEmail }}</span>
        </span>
        <button type="button" class="aws-cog" (click)="goId('settings')" aria-label="Settings">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5 2 2 0 1 1-4 0 1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3 2 2 0 1 1-2.8-2.8 1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1 2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8 2 2 0 1 1 2.8-2.8 1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5 2 2 0 1 1 4 0 1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3 2 2 0 1 1 2.8 2.8 1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1 2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.5 1z"/>
          </svg>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      --slate: #0E1620; --slate-line: rgba(255,255,255,0.08);
      --slate-muted: rgba(255,255,255,0.55); --slate-active: rgba(255,255,255,0.06);
      --admin-red: #B23A2D; --danger: #C0392B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; height: 100%;
    }
    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }

    .aws-sidebar {
      width: 240px; height: 100%; flex-shrink: 0;
      background: var(--slate); color: #E8ECF1;
      border-right: 1px solid var(--slate-line);
      display: flex; flex-direction: column; font-family: var(--font-body);
    }
    .aws-brandbtn {
      height: 64px; padding: 0 18px; flex-shrink: 0; width: 100%;
      display: flex; align-items: center; gap: 10px;
      border: none; border-bottom: 1px solid var(--slate-line); background: transparent;
      cursor: pointer; color: #fff;
    }
    .aws-brand { font-family: var(--font-display); font-size: 1.5rem; font-weight: 500; line-height: 1; }
    .aws-badge {
      margin-left: 2px; font-size: 0.5625rem; font-weight: 700; letter-spacing: 1.4px;
      text-transform: uppercase; color: #fff; background: var(--admin-red);
      padding: 4px 8px; border-radius: 999px; border: 1px solid var(--admin-red);
    }

    .aws-nav { flex: 1; padding: 12px 10px; overflow-y: auto; }
    .aws-section {
      font-size: 0.5625rem; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase;
      color: var(--slate-muted); padding: 14px 12px 6px;
    }
    .aws-item {
      display: flex; align-items: center; gap: 12px; position: relative;
      padding: 10px 12px; border-radius: 10px; margin-bottom: 2px;
      color: #E8ECF1; cursor: pointer; text-decoration: none;
    }
    .aws-item:hover { background: var(--slate-active); }
    .aws-item.is-active { background: var(--slate-active); color: #fff; }
    .aws-bar {
      position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px;
      background: var(--admin-red); border-radius: 2px;
    }
    .aws-ico { display: inline-flex; position: relative; color: rgba(255,255,255,0.7); flex-shrink: 0; }
    .aws-item.is-active .aws-ico { color: #fff; }
    .aws-ico-badge {
      position: absolute; top: -5px; right: -8px; min-width: 16px; height: 16px; padding: 0 4px;
      border-radius: 999px; background: var(--danger); color: #fff; border: 1.5px solid var(--slate);
      font-size: 0.5625rem; font-weight: 700; line-height: 16px; text-align: center;
    }
    .aws-label { font-size: 0.8125rem; letter-spacing: 0.1px; font-weight: 500; }
    .aws-item.is-active .aws-label { font-weight: 600; }

    .aws-foot {
      padding: 12px; border-top: 1px solid var(--slate-line);
      display: flex; align-items: center; gap: 10px;
    }
    .aws-avatar {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #C8A57E, #6B4F3A); color: #fff;
      display: grid; place-items: center; font-size: 0.6875rem; font-weight: 700;
    }
    .aws-foot-text { flex: 1; min-width: 0; }
    .aws-foot-name { display: block; font-size: 0.75rem; font-weight: 600; color: #fff; }
    .aws-foot-email {
      display: block; font-family: var(--font-mono); font-size: 0.625rem; color: var(--slate-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .aws-cog {
      width: 28px; height: 28px; border-radius: 6px; flex-shrink: 0;
      background: transparent; border: 1px solid var(--slate-line);
      display: grid; place-items: center; cursor: pointer;
    }
  `],
})
export class BeautyAdminWebSidebarComponent {
  @Input() active: AdminWebNav = 'dashboard';
  @Input() adminName = 'Maria R.';
  @Input() adminEmail = 'maria@beauty.io';
  /** Badge counts keyed by nav id (e.g. { tickets: 12 }). */
  @Input() badges: Partial<Record<AdminWebNav, number>> = {};
  @Output() follow = new EventEmitter<BffLink>();

  readonly groups = NAV_GROUPS;

  get initials(): string {
    const parts = (this.adminName || 'A').trim().split(/\s+/);
    const a = parts[0]?.[0] ?? 'A';
    const b = parts[1]?.[0] ?? '';
    return (a + b).toUpperCase();
  }

  badgeFor(id: AdminWebNav): number | null {
    const v = this.badges?.[id];
    return v && v > 0 ? v : null;
  }

  goId(id: AdminWebNav): void {
    const def = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === id);
    if (def) this.go(def);
  }

  go(item: AdminNavDef): void {
    if (item.id === this.active) return;
    this.follow.emit({
      rel: item.id, href: null, method: 'NAV',
      screen: item.screen, route: item.route, prompt: item.label,
    });
  }
}
