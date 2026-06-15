/**
 * BeautyAdminWebTopbarComponent — shared desktop top bar for the Admin Portal
 * (web). Per `web-admin-pages.jsx` AdminWebShell topbar.
 *
 * Same notification architecture as `prov-web/prov-web-topbar.component.ts`:
 * the bell self-fetches `beauty_admin_portal_notifications` via the BFF (so it
 * works on every admin page without each page computing a count), the badge is
 * the live `unread` count (hidden when zero), and the dropdown lists real items
 * (flagged accounts, pending provider apps, open tickets) that navigate to
 * their screen on click. Avatar chip → Team & access.
 *
 * Emits NAV BffLinks via (follow). Search is a static pill (no admin command
 * palette yet).
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import { BeautyBffService } from '../beauty-bff.service';

interface AdminNotifItem {
  kind: string;
  title: string;
  sub: string;
  time: string;
  unread: boolean;
  screen: string;
}

/** Map a notification's target screen key → its admin route. */
const NOTIF_ROUTE: Record<string, string> = {
  beauty_admin_portal_crm: '/admin/portal/crm',
  beauty_admin_portal_tickets: '/admin/portal/tickets',
  beauty_admin_portal_audit: '/admin/portal/audit',
};

@Component({
  selector: 'app-admin-web-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="awt-bar">
      <form class="awt-search" role="search" (submit)="onSearch($event)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
        </svg>
        <input class="awt-search-input" type="search" [(ngModel)]="searchQuery" name="q"
               [placeholder]="searchPlaceholder" [attr.aria-label]="searchPlaceholder"
               autocomplete="off" />
        <button type="button" class="awt-search-clear" *ngIf="searchQuery" (click)="clearSearch()" aria-label="Clear search">×</button>
      </form>

      <div class="awt-spacer"></div>

      <div class="awt-notifwrap">
        <button type="button" class="awt-bell" (click)="toggleNotif($event)"
                [attr.aria-expanded]="notifOpen" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>
          </svg>
          <span class="awt-bell-badge" *ngIf="badge">{{ badge }}</span>
        </button>
        <div class="awt-notif-panel" *ngIf="notifOpen" (click)="$event.stopPropagation()">
          <div class="awt-notif-head">
            Notifications<span class="awt-notif-new" *ngIf="notifUnread">{{ notifUnread }} new</span>
          </div>
          <div class="awt-notif-status" *ngIf="notifLoading">Loading…</div>
          <button *ngFor="let n of notifItems" type="button" class="awt-notif-item"
                  [class.unread]="n.unread" (click)="openNotif(n)">
            <span class="awt-notif-dot" [class.on]="n.unread" aria-hidden="true"></span>
            <span class="awt-notif-body">
              <span class="awt-notif-title">{{ n.title }}</span>
              <span class="awt-notif-sub">{{ n.sub }}</span>
            </span>
            <span class="awt-notif-time mono">{{ n.time }}</span>
          </button>
          <div class="awt-notif-status" *ngIf="!notifLoading && !notifItems.length">You're all caught up.</div>
          <div class="awt-notif-foot">
            <a href="#" class="awt-notif-all" (click)="viewAll($event)">View all activity →</a>
          </div>
        </div>
      </div>

      <button type="button" class="awt-user" (click)="goTeam()" aria-label="Admin team">
        <span class="awt-avatar" aria-hidden="true">{{ initials }}</span>
        <span class="awt-user-text">
          <span class="awt-user-name">{{ adminName }}</span>
          <span class="awt-user-email">{{ adminEmail }}</span>
        </span>
      </button>
    </header>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77; --surface: #F2F2F2;
      --admin-red: #B23A2D; --danger: #C0392B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
    }
    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }
    .mono { font-family: var(--font-mono); }

    .awt-bar {
      height: 64px; flex-shrink: 0; background: #fff; border-bottom: 1px solid var(--line);
      display: flex; align-items: center; gap: 14px; padding: 0 20px; font-family: var(--font-body);
    }
    .awt-search {
      flex: 1; max-width: 420px; display: flex; align-items: center; gap: 8px;
      background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
      height: 36px; padding: 0 12px;
    }
    .awt-search-input { flex: 1; border: none; outline: none; background: transparent; font-family: var(--font-body); font-size: 0.8125rem; color: var(--text); min-width: 0; }
    .awt-search-input::placeholder { color: var(--text-muted); }
    .awt-search-input::-webkit-search-cancel-button { display: none; }
    .awt-search-clear { background: #fff; border: 1px solid var(--line); border-radius: 999px; width: 18px; height: 18px; color: var(--text-muted); cursor: pointer; font-size: 0.8125rem; line-height: 1; display: grid; place-items: center; padding: 0; flex-shrink: 0; }
    .awt-spacer { flex: 1; }

    .awt-notifwrap { position: relative; }
    .awt-bell {
      width: 36px; height: 36px; border-radius: 8px; background: transparent; border: none;
      cursor: pointer; display: grid; place-items: center; position: relative;
    }
    .awt-bell-badge {
      position: absolute; top: 5px; right: 5px; min-width: 14px; height: 14px; padding: 0 3px;
      border-radius: 999px; background: var(--danger); color: #fff; border: 1.5px solid #fff;
      font-size: 0.5625rem; font-weight: 700; line-height: 14px; text-align: center;
    }
    .awt-notif-panel {
      position: absolute; top: 44px; right: 0; z-index: 30; width: 320px;
      background: #fff; border: 1px solid var(--line); border-radius: 12px;
      box-shadow: 0 12px 28px rgba(15,35,60,0.14); padding: 6px; max-height: 420px; overflow-y: auto;
    }
    .awt-notif-head { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.0625rem; font-weight: 500; border-bottom: 1px solid var(--surface); }
    .awt-notif-new { font-family: var(--font-body); font-size: 0.625rem; font-weight: 700; color: var(--danger); }
    .awt-notif-item { display: flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; padding: 10px; border: none; background: transparent; border-radius: 8px; cursor: pointer; }
    .awt-notif-item:hover { background: var(--surface); }
    .awt-notif-item.unread { background: rgba(178,58,45,0.06); }
    .awt-notif-dot { width: 7px; height: 7px; border-radius: 50%; background: transparent; flex-shrink: 0; margin-top: 5px; }
    .awt-notif-dot.on { background: var(--admin-red); }
    .awt-notif-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .awt-notif-title { font-size: 0.8125rem; font-weight: 600; color: var(--text); }
    .awt-notif-sub { font-size: 0.6875rem; color: var(--text-muted); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .awt-notif-time { font-size: 0.5625rem; color: var(--text-muted); flex-shrink: 0; }
    .awt-notif-status { padding: 14px 10px; font-size: 0.75rem; color: var(--text-muted); text-align: center; }
    .awt-notif-foot { padding: 8px 10px; border-top: 1px solid var(--surface); }
    .awt-notif-all { font-size: 0.6875rem; color: var(--text); font-weight: 600; text-decoration: none; cursor: pointer; }

    .awt-user {
      display: flex; align-items: center; gap: 10px; padding: 4px 4px 4px 8px;
      border: none; border-left: 1px solid var(--line); background: transparent; cursor: pointer;
    }
    .awt-avatar {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #C8A57E, #6B4F3A); color: #fff;
      display: grid; place-items: center; font-size: 0.6875rem; font-weight: 700;
      box-shadow: 0 0 0 1px var(--line);
    }
    .awt-user-text { display: flex; flex-direction: column; line-height: 1.2; text-align: left; min-width: 0; }
    .awt-user-name { font-size: 0.75rem; font-weight: 600; color: var(--text); }
    .awt-user-email { font-family: var(--font-mono); font-size: 0.625rem; color: var(--text-muted); }
  `],
})
export class BeautyAdminWebTopbarComponent implements OnInit {
  @Input() searchPlaceholder = 'Search accounts, IDs, emails…';
  /** Fallback badge value before the live notifications feed loads. */
  @Input() notifCount: number | null = null;
  @Input() adminName = 'Maria R.';
  @Input() adminEmail = 'maria@beauty.io';
  @Output() follow = new EventEmitter<BffLink>();

  searchQuery = '';
  notifItems: AdminNotifItem[] = [];
  notifUnread = 0;
  notifOpen = false;
  notifLoading = false;
  private notifLoaded = false;

  constructor(private bff: BeautyBffService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.loadNotifs(); }

  get initials(): string {
    const parts = (this.adminName || 'A').trim().split(/\s+/);
    return ((parts[0]?.[0] ?? 'A') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  /** Badge: live unread once loaded, else the explicit input fallback. */
  get badge(): number | null {
    if (this.notifLoaded) return this.notifUnread || null;
    return this.notifCount;
  }

  private loadNotifs(): void {
    this.notifLoading = true;
    this.bff.resolve('beauty_admin_portal_notifications').subscribe({
      next: (resp) => {
        const d = (resp?.data || {}) as Record<string, unknown>;
        this.notifItems = (d['notifications'] as AdminNotifItem[]) || [];
        this.notifUnread = Number(d['unread'] || 0);
        this.notifLoaded = true;
        this.notifLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.notifLoading = false; this.cdr.markForCheck(); },
    });
  }

  /** Global search → jump to the CRM list filtered by the query (the CRM
   * resolver reads `q`). Empty query just opens the unfiltered CRM list. */
  onSearch(e: Event): void {
    e.preventDefault();
    const q = (this.searchQuery || '').trim();
    const route = '/admin/portal/crm' + (q ? '?q=' + encodeURIComponent(q) : '');
    this.follow.emit({
      rel: 'search', href: null, method: 'NAV',
      screen: 'beauty_admin_portal_crm', route, prompt: 'Search',
    });
  }

  clearSearch(): void { this.searchQuery = ''; }

  toggleNotif(e: Event): void {
    e.stopPropagation();
    this.notifOpen = !this.notifOpen;
    if (this.notifOpen) this.loadNotifs();
  }

  openNotif(n: AdminNotifItem): void {
    this.notifOpen = false;
    if (n.unread) { n.unread = false; this.notifUnread = Math.max(0, this.notifUnread - 1); }
    const route = NOTIF_ROUTE[n.screen] || '/admin/portal/dashboard';
    this.follow.emit({ rel: 'notif', href: null, method: 'NAV', screen: n.screen, route, prompt: n.title });
  }

  viewAll(ev: Event): void {
    ev.preventDefault();
    this.notifOpen = false;
    this.follow.emit({
      rel: 'view_all', href: null, method: 'NAV',
      screen: 'beauty_admin_portal_audit', route: '/admin/portal/audit', prompt: 'View all activity',
    });
  }

  @HostListener('document:click')
  onDocClick(): void {
    if (this.notifOpen) { this.notifOpen = false; this.cdr.markForCheck(); }
  }

  goTeam(): void {
    this.follow.emit({
      rel: 'team', href: null, method: 'NAV',
      screen: 'beauty_admin_portal_team', route: '/admin/portal/team', prompt: 'Team & access',
    });
  }
}
