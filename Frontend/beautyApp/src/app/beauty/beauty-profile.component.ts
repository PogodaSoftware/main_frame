/**
 * BeautyProfileComponent (Presentational)
 * ---------------------------------------
 * Customer-web profile. Desktop layout per design `WebCustomerProfile`: shared
 * CustTopNav, a two-column body — left: identity card (avatar, name, email,
 * member badge, lifetime stats); right: grouped settings rows (Account /
 * Preferences / Danger). Collapses on mobile. RN app untouched.
 *
 * Behaviour preserved & BFF-driven: the HATEOAS `logout` POST (via confirm
 * modal) and nav links. Name = email local-part; Joined = `member_since`;
 * Bookings = `stats.booking_count`.
 *
 * NOTE: the profile BFF payload has no Spent / Saved totals, VIP tier, payment
 * instruments, notification prefs, favourite categories, or a delete-account
 * endpoint — so those settings rows are informational (non-navigating) and the
 * design's Spent/Saved stats + Delete-account action are omitted.
 */

import {
  Component,
  EventEmitter,
  Inject,
  Input,
  Output,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyConfirmModalComponent } from './beauty-confirm-modal.component';
import { CustTopNavComponent } from './cust-web/cust-top-nav.component';
import { BeautyHomeSearchComponent } from './beauty-home-search.component';

@Component({
  selector: 'app-beauty-profile',
  standalone: true,
  imports: [CommonModule, BeautyConfirmModalComponent, CustTopNavComponent, BeautyHomeSearchComponent],
  template: `
    <div class="cust-profile">
      <app-cust-top-nav active="" [links]="links" [signedIn]="true" (follow)="emit($event)">
        <app-beauty-home-search topnav-search></app-beauty-home-search>
      </app-cust-top-nav>

      <main id="main" class="profile-main">
        <div class="profile-inner">
          <h1 class="title">Profile</h1>
          <div class="subtitle">Your account, preferences, and payment.</div>

          <div class="grid">
            <!-- Identity -->
            <div class="card identity">
              <div class="id-head">
                <span class="avatar">{{ initials }}</span>
                <div>
                  <div class="id-name">{{ displayName }}</div>
                  <div class="id-email mono">{{ user?.email || '—' }}</div>
                </div>
              </div>
              <span class="member-badge"><span class="member-dot"></span>Member</span>
              <div class="stats">
                <div class="stat" *ngIf="memberSince">
                  <div class="stat-k">Joined</div>
                  <div class="stat-v">{{ memberSince | date: 'mediumDate' }}</div>
                </div>
                <div class="stat">
                  <div class="stat-k">Bookings</div>
                  <div class="stat-v">{{ bookingCount }}</div>
                </div>
              </div>
            </div>

            <!-- Settings -->
            <div class="settings">
              <div class="card pad0 group">
                <div class="group-h">Account</div>
                <div class="srow">
                  <span class="srow-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg></span>
                  <div class="srow-text"><div class="srow-l">Sign-in &amp; security</div><div class="srow-s">{{ user?.email || 'Email' }}</div></div>
                </div>
                <div class="srow">
                  <span class="srow-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg></span>
                  <div class="srow-text"><div class="srow-l">Payment methods</div><div class="srow-s">Managed at checkout</div></div>
                </div>
                <div class="srow">
                  <span class="srow-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg></span>
                  <div class="srow-text"><div class="srow-l">Notifications</div><div class="srow-s">Email reminders 24h before</div></div>
                </div>
              </div>

              <div class="card pad0 group">
                <div class="group-h">Preferences</div>
                <div class="srow">
                  <span class="srow-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z"/></svg></span>
                  <div class="srow-text"><div class="srow-l">Favourite categories</div><div class="srow-s">Set from any studio</div></div>
                </div>
                <div class="srow">
                  <span class="srow-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
                  <div class="srow-text"><div class="srow-l">Location &amp; radius</div><div class="srow-s">{{ locationLabel }}</div></div>
                </div>
              </div>

              <div class="card pad0 group">
                <div class="group-h group-h--danger">Danger</div>
                <button type="button" class="srow srow--btn" (click)="askSignOut()" [disabled]="loggingOut">
                  <span class="srow-ic srow-ic--danger"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C0392B" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></span>
                  <div class="srow-text"><div class="srow-l srow-l--danger" aria-live="polite">{{ loggingOut ? 'Signing out…' : 'Sign out' }}</div><div class="srow-s">End your session</div></div>
                  <svg class="srow-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <app-beauty-confirm-modal
        *ngIf="showSignOutConfirm"
        [open]="showSignOutConfirm"
        [title]="'Sign out?'"
        [body]="'You\\'ll need to sign in again to view your bookings.'"
        [primaryLabel]="'Sign out'"
        [secondaryLabel]="'Stay signed in'"
        [primaryVariant]="'danger'"
        [busy]="loggingOut"
        [busyLabel]="'Signing out…'"
        (confirmed)="logout()"
        (dismissed)="showSignOutConfirm = false"
      />
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --ink: #0A0A0B; --danger: #C0392B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh; background: var(--surface);
      font-family: var(--font-body); color: var(--text);
    }
    * { box-sizing: border-box; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .mono { font-family: var(--font-mono); }

    .cust-profile { display: flex; flex-direction: column; min-height: 100dvh; }
    .profile-main { flex: 1; padding: 32px 32px 48px; }
    .profile-inner { max-width: 1280px; margin: 0 auto; }
    .title { font-family: var(--font-display); font-size: 42px; font-weight: 500; }
    .subtitle { margin-top: 6px; font-size: 14px; color: var(--text-muted); }

    .grid { display: grid; grid-template-columns: 1fr 1.6fr; gap: 16px; margin-top: 24px; align-items: start; }
    .card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 28px; }
    .card.pad0 { padding: 0; overflow: hidden; }

    .id-head { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(135deg, #C8A57E, #6B4F3A); color: #fff; display: grid; place-items: center; font-size: 20px; font-weight: 700; }
    .id-name { font-family: var(--font-display); font-size: 26px; font-weight: 500; }
    .id-email { font-size: 12px; color: var(--text); margin-top: 2px; }
    .member-badge { display: inline-flex; align-items: center; gap: 6px; background: #F1E8DA; color: #7A5A1F; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; }
    .member-dot { width: 6px; height: 6px; border-radius: 50%; background: #7A5A1F; }
    .stats { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .stat-k { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); }
    .stat-v { font-family: var(--font-display); font-size: 20px; font-weight: 500; margin-top: 2px; }

    .settings { display: flex; flex-direction: column; gap: 12px; }
    .group-h { padding: 14px 22px; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); }
    .group-h--danger { color: var(--danger); }
    .srow { display: flex; align-items: center; gap: 14px; padding: 14px 22px; border-top: 1px solid var(--surface); width: 100%; text-align: left; background: transparent; border-left: none; border-right: none; border-bottom: none; font-family: var(--font-body); }
    .srow--btn { cursor: pointer; }
    .srow--btn:hover:not(:disabled) { background: var(--surface-2); }
    .srow--btn:disabled { opacity: .6; cursor: not-allowed; }
    .srow-ic { width: 32px; height: 32px; border-radius: 8px; background: var(--surface); display: grid; place-items: center; flex-shrink: 0; }
    .srow-text { flex: 1; min-width: 0; }
    .srow-l { font-size: 13px; font-weight: 600; }
    .srow-l--danger { color: var(--danger); }
    .srow-s { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .srow-chev { flex-shrink: 0; }

    @media (max-width: 860px) {
      .grid { grid-template-columns: 1fr; }
      .profile-main { padding: 20px; }
      .title { font-size: 32px; }
    }
  `],
})
export class BeautyProfileComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  loggingOut = false;
  showSignOutConfirm = false;
  private isBrowser = false;

  constructor(
    private authService: BeautyAuthService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get user(): { email?: string; name?: string } | null {
    return (this.data['user'] as { email?: string; name?: string }) || null;
  }
  get displayName(): string {
    const u = this.user;
    if (u?.name) return u.name;
    const local = (u?.email || '').split('@')[0];
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'Beauty';
  }
  get initials(): string {
    const parts = this.displayName.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (this.displayName.slice(0, 2) || 'ME').toUpperCase();
  }
  get memberSince(): string | null {
    return (this.data['user'] as { member_since?: string } | undefined)?.member_since || null;
  }
  get bookingCount(): number {
    return (this.data['stats'] as { booking_count?: number } | undefined)?.booking_count ?? 0;
  }
  get locationLabel(): string {
    if (this.isBrowser) {
      try {
        const c = localStorage.getItem('beauty_customer_city');
        if (c && c.trim()) return `${c.trim()} · 3 mi`;
      } catch { /* locked */ }
    }
    return 'Set your city';
  }

  askSignOut(): void { if (!this.loggingOut) this.showSignOutConfirm = true; }

  emit(link: BffLink | null | undefined): void { if (link) this.followLink.emit(link); }

  logout(): void {
    const link = this.links['logout'];
    if (!link || this.loggingOut) return;
    this.loggingOut = true;
    this.authService.follow(link).subscribe({
      next: () => { this.loggingOut = false; this.showSignOutConfirm = false; const home = this.links['home']; if (home) this.followLink.emit(home); },
      error: () => { this.loggingOut = false; this.showSignOutConfirm = false; const home = this.links['home']; if (home) this.followLink.emit(home); },
    });
  }
}
