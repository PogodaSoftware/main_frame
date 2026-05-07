/**
 * BeautyProfileComponent (Presentational)
 * ---------------------------------------
 * Shows the signed-in customer's profile (email + member-since), a
 * shortcut to My Bookings, and a HATEOAS logout button.
 */

import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyConfirmModalComponent } from './beauty-confirm-modal.component';

@Component({
  selector: 'app-beauty-profile',
  standalone: true,
  imports: [CommonModule, BeautyConfirmModalComponent],
  template: `
    <div class="beauty-app">
      <header class="sub-header">
        <button type="button" class="back-btn" (click)="emit(links['home'])" aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      </header>

      <main id="main" class="profile-section">
        <div class="avatar-block">
          <div class="avatar">{{ initial }}</div>
          <h1 class="display-name">{{ displayName }}</h1>
          <span class="email-mono">{{ user?.email || '—' }}</span>
        </div>

        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Email</span>
            <span class="info-value">{{ user?.email || '—' }}</span>
          </div>
          <div class="info-row" *ngIf="memberSince">
            <span class="info-label">Member since</span>
            <span class="info-value">{{ memberSince | date: 'mediumDate' }}</span>
          </div>
          <div class="info-row last">
            <span class="info-label">Bookings</span>
            <span class="info-value">{{ bookingCount }}</span>
          </div>
        </div>

        <div class="action-card">
          <button type="button" class="action-row" (click)="emit(links['bookings'])" [disabled]="!links['bookings']">
            <div class="action-text">
              <div class="action-label">My Bookings</div>
              <div class="action-sub">View past &amp; upcoming</div>
            </div>
            <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button type="button" class="action-row" disabled>
            <div class="action-text">
              <div class="action-label">Notifications</div>
              <div class="action-sub">Reminders &amp; updates</div>
            </div>
            <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button type="button" class="action-row last" disabled>
            <div class="action-text">
              <div class="action-label">Payment methods</div>
              <div class="action-sub">Cards &amp; receipts</div>
            </div>
            <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <div class="action-card">
          <button type="button" class="action-row danger last" (click)="askSignOut()" [disabled]="loggingOut">
            <div class="action-text">
              <div class="action-label" aria-live="polite">{{ loggingOut ? 'Signing out…' : 'Sign out' }}</div>
              <div class="action-sub">End your session</div>
            </div>
            <svg class="chev danger" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <div class="version-footer">Beauty · v0.1.0</div>
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

      <nav class="bottom-nav" aria-label="Primary">
        <button type="button" class="nav-tab" (click)="emit(links['bookings'])" [disabled]="!links['bookings']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2.5"/>
            <path d="M3 10h18M8 3v4M16 3v4"/>
          </svg>
          <span class="nav-label">Bookings</span>
        </button>
        <button type="button" class="nav-tab" (click)="emit(links['home'])" [disabled]="!links['home']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 11l9-7 9 7v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9z"/>
          </svg>
          <span class="nav-label">Home</span>
        </button>
        <button type="button" class="nav-tab" (click)="emit(links['chats'])" [disabled]="!links['chats']" data-testid="nav-chat">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="nav-label">Chat</span>
        </button>
        <button type="button" class="nav-tab is-active" (click)="emit(links['self'])">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.8"/>
            <path d="M4.5 21c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5"/>
          </svg>
          <span class="nav-label">Profile</span>
        </button>
      </nav>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF;
      --ink: #0A0A0B; --success: #2F7A47; --danger: #C0392B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
    }
    * { box-sizing: border-box; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .beauty-app { display: flex; flex-direction: column; min-height: 100dvh; background: var(--surface); font-family: var(--font-body); color: var(--text); }
    .sub-header { display: flex; align-items: center; height: 56px; padding: 0 12px; background: var(--surface); border-bottom: 1px solid var(--line); flex-shrink: 0; }
    .back-btn { min-width: 44px; min-height: 44px; width: 44px; height: 44px; border-radius: 8px; background: transparent; border: none; color: var(--text); display: grid; place-items: center; cursor: pointer; }
    .action-row { min-height: 44px; }
    .back-btn:hover { background: var(--surface-2); }

    .profile-section { flex: 1; padding: 24px 20px; max-width: 480px; width: 100%; margin: 0 auto; overflow-y: auto; }
    .avatar-block { display: flex; flex-direction: column; align-items: center; margin-bottom: 22px; }
    .avatar { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #BFD8EE, #7DA8CF); display: grid; place-items: center; font-family: var(--font-display); font-size: 2.125rem; font-weight: 500; color: #1a3a52; margin-bottom: 12px; box-shadow: 0 4px 14px rgba(125,168,207,0.35); text-transform: uppercase; }
    .display-name { font-family: var(--font-display); font-size: 1.75rem; font-weight: 500; margin: 0; letter-spacing: 0.2px; }
    .email-mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }

    .info-card, .action-card { background: #FFFFFF; border: 1px solid var(--line); border-radius: 12px; margin-bottom: 16px; overflow: hidden; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid var(--line); }
    .info-row.last { border-bottom: none; }
    .info-label { font-size: 0.8rem; color: var(--text-muted); }
    .info-value { font-size: 0.8rem; font-weight: 500; color: var(--text); }

    .action-row { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--line); cursor: pointer; background: transparent; border-left: none; border-right: none; border-top: none; width: 100%; text-align: left; font-family: var(--font-body); }
    .action-row.last { border-bottom: none; }
    .action-row:hover:not(:disabled) { background: var(--surface-2); }
    .action-row:disabled { cursor: not-allowed; opacity: 0.5; }
    .action-text { flex: 1; }
    .action-label { font-size: 0.8rem; font-weight: 600; color: var(--text); }
    .action-row.danger .action-label { color: var(--danger); }
    .action-sub { font-size: 0.7rem; color: var(--text-muted); margin-top: 1px; }
    .chev { color: var(--text-muted); flex-shrink: 0; }
    .chev.danger { color: var(--danger); }

    .version-footer { text-align: center; margin-top: 18px; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 0.625rem; color: var(--text-muted); }

    .bottom-nav { display: flex; background: #FFFFFF; border-top: 1px solid var(--line); box-shadow: 0 -2px 14px rgba(15,35,60,0.08); flex-shrink: 0; padding-bottom: env(safe-area-inset-bottom); }
    .nav-tab { flex: 1; height: 64px; background: transparent; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; position: relative; color: var(--text); font-family: var(--font-body); }
    .nav-tab:disabled { opacity: 0.4; cursor: not-allowed; }
    .nav-tab.is-active { color: #1a3a52; }
    .nav-dot { position: absolute; top: 6px; width: 6px; height: 6px; border-radius: 50%; background: transparent; }
    .nav-tab.is-active .nav-dot { background: var(--accent-blue-deep); }
    .nav-icon { width: 24px; height: 24px; }
    .nav-label { font-size: 0.7rem; font-weight: 500; line-height: 1; letter-spacing: 0.1px; }
    .nav-tab.is-active .nav-label { font-weight: 600; }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
  `],
})
export class BeautyProfileComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  loggingOut = false;
  showSignOutConfirm = false;

  constructor(private authService: BeautyAuthService) {}

  askSignOut(): void {
    if (this.loggingOut) return;
    this.showSignOutConfirm = true;
  }

  get user(): { email?: string; name?: string } | null {
    return (this.data['user'] as { email?: string; name?: string }) || null;
  }
  get displayName(): string {
    const u = this.user;
    if (u?.name) return u.name;
    const email = u?.email || '';
    const local = email.split('@')[0];
    return local || 'Beauty';
  }
  get initial(): string {
    return (this.displayName || 'B').charAt(0);
  }
  get memberSince(): string | null {
    const u = this.data['user'] as { member_since?: string } | undefined;
    return u?.member_since || null;
  }
  get bookingCount(): number {
    const s = this.data['stats'] as { booking_count?: number } | undefined;
    return s?.booking_count ?? 0;
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  logout(): void {
    const link = this.links['logout'];
    if (!link || this.loggingOut) return;
    this.loggingOut = true;
    this.authService.follow(link).subscribe({
      next: () => {
        this.loggingOut = false;
        this.showSignOutConfirm = false;
        const home = this.links['home'];
        if (home) this.followLink.emit(home);
      },
      error: () => {
        this.loggingOut = false;
        this.showSignOutConfirm = false;
        const home = this.links['home'];
        if (home) this.followLink.emit(home);
      },
    });
  }
}
