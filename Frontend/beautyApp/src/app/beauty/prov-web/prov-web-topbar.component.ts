/**
 * BeautyProvWebTopbarComponent — shared desktop topbar (web-chrome.jsx WebTopbar).
 * 64px: search field (⌘K hint), notification bell (real BFF count), user chip
 * (avatar + name + email) → profile. Emits (follow) NAV links.
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
import { HttpClient } from '@angular/common/http';

import { BffLink } from '../beauty-bff.types';
import { BeautyAuthService } from '../beauty-auth.service';
import { BeautyBffService } from '../beauty-bff.service';
import { environment } from '../../../environments/environment';

interface TopSearchItem {
  id: number;
  name: string;
  provider?: { name?: string };
  price_cents: number;
  duration_minutes: number;
}

interface NotifItem {
  kind: string;
  title: string;
  sub: string;
  time: string;
  unread: boolean;
  screen: string;
}

const NOTIF_ROUTE: Record<string, string> = {
  beauty_business_messages: '/business/messages',
  beauty_business_bookings: '/business/bookings',
};

@Component({
  selector: 'app-prov-web-topbar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pw-topbar">
      <div class="pw-searchwrap">
        <div class="pw-search" role="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input type="search" [placeholder]="searchPlaceholder" [attr.aria-label]="searchPlaceholder"
                 [value]="query" (input)="onInput($any($event.target).value)"
                 (focus)="query && (open = true)" (keydown.escape)="close()" />
          <button *ngIf="query" type="button" class="pw-clear" (click)="clear()" aria-label="Clear search">✕</button>
        </div>
        <div class="pw-results" *ngIf="open && query.trim()">
          <div class="pw-res-status" *ngIf="loading">Searching…</div>
          <button *ngFor="let r of results" type="button" class="pw-res" (mousedown)="openResult(r)">
            <span class="pw-res-name">{{ r.name }}</span>
            <span class="pw-res-meta">{{ r.provider?.name }} · {{ r.duration_minutes }} min · \${{ (r.price_cents / 100).toFixed(0) }}</span>
          </button>
          <div class="pw-res-status" *ngIf="!loading && !results.length">No services match.</div>
        </div>
      </div>

      <div class="pw-spacer"></div>

      <div class="pw-notifwrap">
        <button type="button" class="pw-bell" (click)="toggleNotif($event)"
                [attr.aria-expanded]="notifOpen" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          <span class="pw-bell-badge" *ngIf="badge">{{ badge }}</span>
        </button>
        <div class="pw-notif-panel" *ngIf="notifOpen" (click)="$event.stopPropagation()">
          <div class="pw-notif-head">
            Notifications<span class="pw-notif-new" *ngIf="notifUnread">{{ notifUnread }} new</span>
          </div>
          <div class="pw-notif-status" *ngIf="notifLoading">Loading…</div>
          <button *ngFor="let n of notifItems" type="button" class="pw-notif-item"
                  [class.unread]="n.unread" (click)="openNotif(n)">
            <span class="pw-notif-dot" [class.on]="n.unread" aria-hidden="true"></span>
            <span class="pw-notif-body">
              <span class="pw-notif-title">{{ n.title }}</span>
              <span class="pw-notif-sub">{{ n.sub }}</span>
            </span>
            <span class="pw-notif-time">{{ n.time }}</span>
          </button>
          <div class="pw-notif-status" *ngIf="!notifLoading && !notifItems.length">You're all caught up.</div>
        </div>
      </div>

      <button type="button" class="pw-user" (click)="goProfile()" aria-label="Open profile">
        <span class="pw-user-avatar" aria-hidden="true">{{ initial }}</span>
        <span class="pw-user-text">
          <span class="pw-user-name">{{ businessName }}</span>
          <span class="pw-user-email">{{ email }}</span>
        </span>
      </button>
    </header>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77; --surface: #F2F2F2;
      --danger: #C0392B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .pw-topbar {
      height: 64px; flex-shrink: 0; background: #fff;
      border-bottom: 1px solid var(--line);
      display: flex; align-items: center; gap: 16px; padding: 0 20px;
      font-family: var(--font-body);
    }
    .pw-searchwrap { flex: 1; max-width: 420px; position: relative; }
    .pw-search {
      height: 36px; display: flex; align-items: center; gap: 8px;
      background: var(--surface); border: 1px solid var(--line);
      border-radius: 10px; padding: 0 12px; color: var(--text-muted);
    }
    .pw-search input {
      flex: 1; border: none; background: transparent; outline: none;
      font-family: var(--font-body); font-size: 0.8125rem; color: var(--text);
    }
    .pw-search input::placeholder { color: var(--text-muted); }
    .pw-search input::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; }
    .pw-clear {
      border: none; background: transparent; cursor: pointer;
      color: var(--text-muted); font-size: 0.75rem; padding: 2px; line-height: 1;
    }
    .pw-results {
      position: absolute; top: 42px; left: 0; right: 0; z-index: 20;
      background: #fff; border: 1px solid var(--line); border-radius: 12px;
      box-shadow: 0 12px 28px rgba(15,35,60,0.12);
      padding: 6px; max-height: 360px; overflow-y: auto;
    }
    .pw-res {
      display: flex; flex-direction: column; gap: 2px; width: 100%; text-align: left;
      padding: 8px 10px; border: none; background: transparent; border-radius: 8px; cursor: pointer;
    }
    .pw-res:hover { background: var(--surface); }
    .pw-res-name { font-size: 0.8125rem; font-weight: 600; color: var(--text); }
    .pw-res-meta { font-family: var(--font-mono); font-size: 0.625rem; color: var(--text-muted); }
    .pw-res-status { padding: 10px; font-size: 0.75rem; color: var(--text-muted); text-align: center; }
    .pw-spacer { flex: 1; }
    .pw-bell {
      width: 36px; height: 36px; border-radius: 8px; border: none; background: transparent;
      cursor: pointer; display: grid; place-items: center; position: relative; color: var(--text);
    }
    .pw-bell-badge {
      position: absolute; top: 5px; right: 5px; min-width: 14px; height: 14px; padding: 0 3px;
      border-radius: 999px; background: var(--danger); color: #fff;
      font-size: 0.5625rem; font-weight: 700; line-height: 14px; text-align: center;
      border: 1.5px solid #fff;
    }
    .pw-notifwrap { position: relative; }
    .pw-notif-panel {
      position: absolute; top: 44px; right: 0; z-index: 30; width: 320px;
      background: #fff; border: 1px solid var(--line); border-radius: 12px;
      box-shadow: 0 12px 28px rgba(15,35,60,0.14); padding: 6px; max-height: 420px; overflow-y: auto;
    }
    .pw-notif-head { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.0625rem; font-weight: 500; border-bottom: 1px solid var(--surface); }
    .pw-notif-new { font-family: var(--font-body); font-size: 0.625rem; font-weight: 700; color: var(--danger); }
    .pw-notif-item { display: flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; padding: 10px; border: none; background: transparent; border-radius: 8px; cursor: pointer; }
    .pw-notif-item:hover { background: var(--surface); }
    .pw-notif-item.unread { background: rgba(207,227,245,0.35); }
    .pw-notif-dot { width: 7px; height: 7px; border-radius: 50%; background: transparent; flex-shrink: 0; margin-top: 5px; }
    .pw-notif-dot.on { background: #7DA8CF; }
    .pw-notif-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .pw-notif-title { font-size: 0.8125rem; font-weight: 600; color: var(--text); }
    .pw-notif-sub { font-size: 0.6875rem; color: var(--text-muted); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pw-notif-time { font-family: var(--font-mono); font-size: 0.5625rem; color: var(--text-muted); flex-shrink: 0; }
    .pw-notif-status { padding: 14px 10px; font-size: 0.75rem; color: var(--text-muted); text-align: center; }

    .pw-user {
      display: flex; align-items: center; gap: 10px; padding: 4px 4px 4px 12px;
      border: none; border-left: 1px solid var(--line); background: transparent; cursor: pointer;
    }
    .pw-user-avatar {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #C8A57E, #6B4F3A); color: #fff;
      display: grid; place-items: center; font-size: 0.6875rem; font-weight: 700;
      box-shadow: 0 0 0 1px var(--line);
    }
    .pw-user-text { text-align: left; min-width: 0; }
    .pw-user-name { display: block; font-size: 0.75rem; font-weight: 600; color: var(--text); }
    .pw-user-email {
      display: block; font-family: var(--font-mono); font-size: 0.625rem; color: var(--text-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px;
    }
    @media screen and (max-width: 720px) {
      .pw-user-text { display: none; }
      .pw-search { max-width: none; }
    }
  `],
})
export class BeautyProvWebTopbarComponent implements OnInit {
  @Input() businessName = 'Your storefront';
  @Input() email = '';
  @Input() notifCount: number | null = null;
  @Input() searchPlaceholder = 'Search services, bookings, customers…';
  @Output() follow = new EventEmitter<BffLink>();

  /** Notifications — self-fetched from the BFF so the bell works on every
   *  business page without each page computing a count. */
  notifItems: NotifItem[] = [];
  notifUnread = 0;
  notifOpen = false;
  notifLoading = false;
  private notifLoaded = false;

  /** Topbar search — reuses the same `/api/beauty/services/search/` endpoint
   *  the RN/customer HomeSearch uses; results open the service's booking page. */
  query = '';
  results: TopSearchItem[] = [];
  loading = false;
  open = false;
  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private http: HttpClient,
    private auth: BeautyAuthService,
    private bff: BeautyBffService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void { this.loadNotifs(); }

  get initial(): string {
    return (this.businessName || '·').trim()[0]?.toUpperCase() || '·';
  }

  /** Badge: live notification unread, falling back to any explicit input. */
  get badge(): number | null {
    if (this.notifLoaded) return this.notifUnread || null;
    return this.notifCount;
  }

  private loadNotifs(): void {
    this.notifLoading = true;
    this.bff.resolve('beauty_business_notifications').subscribe({
      next: (resp) => {
        const d = (resp?.data || {}) as Record<string, unknown>;
        this.notifItems = (d['notifications'] as NotifItem[]) || [];
        this.notifUnread = Number(d['unread'] || 0);
        this.notifLoaded = true;
        this.notifLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.notifLoading = false; this.cdr.markForCheck(); },
    });
  }

  toggleNotif(e: Event): void {
    e.stopPropagation();
    this.notifOpen = !this.notifOpen;
    if (this.notifOpen) this.loadNotifs();  // refresh on open
  }

  openNotif(n: NotifItem): void {
    this.notifOpen = false;
    if (n.unread) { n.unread = false; this.notifUnread = Math.max(0, this.notifUnread - 1); }
    const route = NOTIF_ROUTE[n.screen] || '/business';
    this.follow.emit({ rel: 'notif', href: null, method: 'NAV', screen: n.screen, route, prompt: n.title });
  }

  @HostListener('document:click')
  onDocClick(): void {
    if (this.notifOpen) { this.notifOpen = false; this.cdr.markForCheck(); }
  }

  onInput(value: string): void {
    this.query = value;
    const q = value.trim();
    if (this.debounce) clearTimeout(this.debounce);
    if (!q) { this.results = []; this.open = false; return; }
    this.open = true;
    this.debounce = setTimeout(() => this.runSearch(q), 300);
  }

  private runSearch(q: string): void {
    this.loading = true;
    const url = `${environment.apiBaseUrl}/api/beauty/services/search/`
      + `?q=${encodeURIComponent(q)}&offset=0&limit=8&includeFuture=true`;
    this.http.get<{ items: TopSearchItem[] }>(url, {
      withCredentials: true, headers: this.auth.getAuthHeaders(),
    }).subscribe({
      next: (resp) => { this.results = resp?.items || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.results = []; this.loading = false; this.cdr.markForCheck(); },
    });
  }

  openResult(r: TopSearchItem): void {
    this.clear();
    this.follow.emit({
      rel: 'service', href: null, method: 'NAV',
      screen: 'beauty_book', route: `/book/${r.id}`,
      params: { serviceId: r.id }, prompt: r.name,
    });
  }

  clear(): void { this.query = ''; this.results = []; this.open = false; }
  close(): void { this.open = false; }

  goProfile(): void {
    this.follow.emit({
      rel: 'profile', href: null, method: 'NAV',
      screen: 'beauty_business_profile', route: '/business/profile', prompt: 'Profile',
    });
  }
}
