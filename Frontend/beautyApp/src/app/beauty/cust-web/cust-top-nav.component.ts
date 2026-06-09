/**
 * CustTopNavComponent — shared signed-in customer-web top nav (responsive).
 *
 * Sticky desktop chrome mirroring the design `CustTopNav`: brand → home, the
 * fixed Discover / My bookings / Saved / Messages items, a search pill (the
 * live home-search is projected in via `[topnav-search]`), a notifications
 * bell, and an avatar → profile. Signed-out shows Sign in / Sign up.
 * Collapses on mobile (<920px).
 *
 * Nav items are fixed route NAV links (always shown, matching the design) so
 * the chrome is identical on every signed-in screen regardless of which links
 * a given page's BFF payload happens to include. The signed-in customer's
 * display name is fetched once from `/protected/me/` so the avatar shows the
 * real person (email local-part) on every page. Clicks emit (follow); the
 * shell navigates by `route`.
 */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Inject, Input, OnInit, Output, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { BffLink } from '../beauty-bff.types';
import { BeautyAuthService } from '../beauty-auth.service';
import { environment } from '../../../environments/environment';

interface NavItem { id: string; label: string; screen: string; route: string; }

// App-relative routes (Angular base href is /pogoda/beauty/). Emitting these
// without the base prefix means every consumer — the shell's normalizer AND
// standalone pages — navigates correctly with no risk of a double prefix.
const BASE = '';
const NAV_ITEMS: NavItem[] = [
  { id: 'home',     label: 'Discover',    screen: 'beauty_home',      route: `${BASE}/` },
  { id: 'bookings', label: 'My bookings', screen: 'beauty_bookings',  route: `${BASE}/bookings` },
  { id: 'fav',      label: 'Saved',       screen: 'beauty_favorites', route: `${BASE}/saved` },
  { id: 'messages', label: 'Messages',    screen: 'beauty_chats',     route: `${BASE}/chats` },
];

@Component({
  selector: 'app-cust-top-nav',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cust-topnav">
      <!-- Brand -->
      <button type="button" class="brand" (click)="goRoute('beauty_home', homeRoute)" aria-label="Beauty home">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/></svg>
        <span class="brand-name">Beauty</span>
      </button>

      <!-- Primary nav (fixed, matches design) -->
      <nav class="nav" aria-label="Primary">
        <button
          *ngFor="let item of navItems"
          type="button"
          class="nav-item"
          [class.is-active]="item.id === active"
          [attr.aria-current]="item.id === active ? 'page' : null"
          (click)="goRoute(item.screen, item.route)"
        >
          <svg class="nav-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" [ngSwitch]="item.id">
            <ng-container *ngSwitchCase="'home'"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/></ng-container>
            <ng-container *ngSwitchCase="'bookings'"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></ng-container>
            <ng-container *ngSwitchCase="'fav'"><path d="M12 21s-7-4.5-9.5-9C1 9.5 2.5 5 7 5c2.5 0 4 1.5 5 3 1-1.5 2.5-3 5-3 4.5 0 6 4.5 4.5 7C19 16.5 12 21 12 21z"/></ng-container>
            <ng-container *ngSwitchCase="'messages'"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/></ng-container>
          </svg>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>

      <!-- Search pill (live home-search projected in) -->
      <div class="search">
        <svg class="search-ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <div class="search-slot"><ng-content select="[topnav-search]"></ng-content></div>
        <span class="search-sep" *ngIf="city"></span>
        <span class="search-city" *ngIf="city">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {{ city }}
        </span>
      </div>

      <div class="spacer"></div>

      <!-- Account -->
      <ng-container *ngIf="signedIn; else guest">
        <button type="button" class="bell" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
          <span class="bell-dot"></span>
        </button>
        <button type="button" class="account" (click)="goRoute('beauty_profile', profileRoute)">
          <span class="avatar">{{ resolvedInitials }}</span>
          <span class="account-text">
            <span class="account-name">{{ resolvedName }}</span>
            <span class="account-meta">{{ resolvedMeta }}</span>
          </span>
        </button>
      </ng-container>
      <ng-template #guest>
        <div class="guest">
          <button type="button" class="btn btn--secondary" (click)="goRoute('beauty_login', loginRoute)">Sign in</button>
          <button type="button" class="btn btn--primary" (click)="goRoute('beauty_signup', signupRoute)">Sign up</button>
        </div>
      </ng-template>
    </header>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --surface: #F2F2F2; --ink: #0A0A0B; --ink-soft: #1F1F22; --danger: #C0392B;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
    }
    * { box-sizing: border-box; }

    .cust-topnav {
      position: sticky; top: 0; z-index: 100;
      height: 72px; background: #fff; border-bottom: 1px solid var(--line);
      padding: 0 32px; display: flex; align-items: center; gap: 24px;
      font-family: var(--font-body);
    }

    .brand { display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer; padding: 0; flex-shrink: 0; }
    .brand-name { font-family: var(--font-display); font-size: 28px; font-weight: 500; color: var(--text); line-height: 1; }

    .nav { display: flex; gap: 2px; align-items: center; flex-shrink: 0; }
    .nav-item {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 8px 14px; border-radius: 999px; border: none; background: transparent;
      font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer;
    }
    .nav-item:hover { background: var(--surface); color: var(--text); }
    .nav-item.is-active { background: var(--surface); color: var(--text); font-weight: 600; }
    .nav-ic { width: 18px; height: 18px; }

    .search {
      flex: 1; max-width: 560px; min-width: 0;
      display: flex; align-items: center; height: 44px;
      background: #fff; border: 1px solid var(--line); border-radius: 999px;
      padding: 0 8px 0 16px;
    }
    .search-ic { flex-shrink: 0; }
    .search-slot { flex: 1; min-width: 0; display: flex; align-items: center; }
    .search-sep { width: 1px; height: 24px; background: var(--line); margin: 0 10px; flex-shrink: 0; }
    .search-city { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text); white-space: nowrap; flex-shrink: 0; }

    .spacer { flex: 1; }

    .bell { position: relative; width: 38px; height: 38px; border-radius: 50%; background: var(--surface); border: none; cursor: pointer; display: grid; place-items: center; flex-shrink: 0; }
    .bell-dot { position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: var(--danger); border: 1.5px solid var(--surface); }

    .account { display: flex; align-items: center; gap: 8px; background: none; border: none; cursor: pointer; padding: 0; flex-shrink: 0; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #C8A57E, #6B4F3A); color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 700; }
    .account-text { display: flex; flex-direction: column; line-height: 1.2; text-align: left; }
    .account-name { font-size: 12px; font-weight: 600; color: var(--text); }
    .account-meta { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }

    .guest { display: flex; gap: 8px; flex-shrink: 0; }
    .btn { height: 38px; padding: 0 16px; border-radius: 10px; font-family: var(--font-body); font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn--primary { background: var(--ink); color: #fff; border: 1px solid var(--ink); }
    .btn--primary:hover { background: var(--ink-soft); border-color: var(--ink-soft); }
    .btn--secondary { background: #fff; color: var(--text); border: 1px solid var(--line); }
    .btn--secondary:hover { border-color: #7DA8CF; }

    @media (max-width: 920px) {
      .cust-topnav { height: 64px; padding: 0 16px; gap: 14px; }
      .nav { display: none; }
      .search-city, .search-sep { display: none; }
      .account-text { display: none; }
      .brand-name { font-size: 24px; }
    }
    @media (max-width: 560px) { .search { display: none; } }
  `],
})
export class CustTopNavComponent implements OnInit {
  @Input() active = 'home';
  @Input() links: Record<string, BffLink> = {};
  @Input() signedIn = false;
  @Input() userName = '';
  @Input() userInitials = '';
  @Input() userMeta = '';
  @Input() city = '';
  @Output() follow = new EventEmitter<BffLink>();

  readonly navItems = NAV_ITEMS;
  readonly homeRoute = `${BASE}/`;
  readonly profileRoute = `${BASE}/profile`;
  readonly loginRoute = `${BASE}/login`;
  readonly signupRoute = `${BASE}/signup`;

  /** Identity fetched from /protected/me/ (email local-part as the name). */
  private fetchedName = '';
  private fetchedInitials = '';
  private fetchedMeta = '';
  private isBrowser = false;

  constructor(
    private http: HttpClient,
    private auth: BeautyAuthService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Use an explicit @Input override when given; otherwise self-fetch so the
    // avatar shows the real person on every signed-in page.
    if (!this.signedIn || this.userName || !this.isBrowser) return;
    this.http.get<{ email?: string; business_name?: string; user_type?: string }>(
      `${environment.apiBaseUrl}/api/beauty/protected/me/`,
      { withCredentials: true, headers: this.auth.getAuthHeaders() },
    ).subscribe({
      next: (me) => {
        const name = me?.business_name || this.nameFromEmail(me?.email);
        this.fetchedName = name;
        this.fetchedInitials = this.initialsFrom(name);
        this.fetchedMeta = me?.user_type === 'business' ? 'Business' : 'Customer';
        this.cdr.markForCheck();
      },
      error: () => { /* keep defaults */ },
    });
  }

  get resolvedName(): string { return this.userName || this.fetchedName || 'Account'; }
  get resolvedInitials(): string { return this.userInitials || this.fetchedInitials || this.initialsFrom(this.resolvedName); }
  get resolvedMeta(): string { return this.userMeta || this.fetchedMeta || 'Customer'; }

  private nameFromEmail(email?: string): string {
    if (!email) return '';
    const local = email.split('@')[0] || '';
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : '';
  }
  private initialsFrom(name: string): string {
    const parts = (name || '').trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name.slice(0, 2) || 'ME').toUpperCase();
  }

  goRoute(screen: string, route: string): void {
    this.follow.emit({ rel: screen, href: null, method: 'NAV', screen, route, prompt: null });
  }
}
