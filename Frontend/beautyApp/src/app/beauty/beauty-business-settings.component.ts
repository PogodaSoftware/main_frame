/**
 * BeautyBusinessSettingsComponent — desktop redesign per Business Provider
 * Portal · Web handoff (web-settings). Sidebar/topbar chrome, centered title,
 * three cards (Account · Business · Danger zone) of icon rows. Real rows
 * follow BFF links; rows with no backend yet surface a "coming soon" note.
 * Sign out / Delete account keep the shared two-stage confirm modals.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyConfirmModalComponent } from './beauty-confirm-modal.component';
import { BeautyProvWebSidebarComponent, ProvWebNav } from './prov-web/prov-web-sidebar.component';
import { BeautyProvWebTopbarComponent } from './prov-web/prov-web-topbar.component';

interface MenuRow {
  label: string;
  sub: string;
  icon: string;
  link?: string;          // BFF link key to follow
  action?: 'logout' | 'delete';
  danger?: boolean;
  soon?: boolean;         // no backend yet
  testid?: string;
}

@Component({
  selector: 'app-beauty-business-settings',
  standalone: true,
  imports: [CommonModule, BeautyConfirmModalComponent, BeautyProvWebSidebarComponent, BeautyProvWebTopbarComponent],
  template: `
    <div class="pw-shell">
      <app-prov-web-sidebar
        active="settings"
        [businessName]="business?.business_name || 'Your storefront'"
        [email]="business?.email || ''"
        [storefrontLive]="true"
        [badges]="navBadges"
        (follow)="emit($event)">
      </app-prov-web-sidebar>

      <div class="pw-main">
        <app-prov-web-topbar
          [businessName]="business?.business_name || 'Your storefront'"
          [email]="business?.email || ''"
          [notifCount]="0"
          (follow)="emit($event)">
        </app-prov-web-topbar>

        <main id="main" class="pw-content">
          <div class="pw-header">
            <div class="pw-header-text pw-header-centered">
              <h1 class="pw-title">Settings</h1>
              <div class="pw-sub">Account, business, and security</div>
            </div>
          </div>

          <div class="pw-pad set-grid">
            <section class="web-card set-card">
              <div class="set-eyebrow">Account</div>
              <ng-container *ngFor="let r of accountRows">
                <ng-container *ngTemplateOutlet="rowTpl; context: {$implicit: r}"></ng-container>
              </ng-container>
            </section>

            <section class="web-card set-card">
              <div class="set-eyebrow">Business</div>
              <ng-container *ngFor="let r of businessRows">
                <ng-container *ngTemplateOutlet="rowTpl; context: {$implicit: r}"></ng-container>
              </ng-container>
            </section>

            <section class="web-card set-card">
              <div class="set-eyebrow danger">Danger zone</div>
              <ng-container *ngFor="let r of dangerRows">
                <ng-container *ngTemplateOutlet="rowTpl; context: {$implicit: r}"></ng-container>
              </ng-container>
            </section>
          </div>

          <p *ngIf="message" class="pw-pad msg" [class.error]="isError"
             [attr.role]="isError ? 'alert' : 'status'" aria-live="polite">{{ message }}</p>
        </main>
      </div>

      <ng-template #rowTpl let-r>
        <button type="button" class="set-row" [class.danger]="r.danger"
                [attr.data-testid]="r.testid" [disabled]="rowDisabled(r)" (click)="onRowClick(r)">
          <span class="set-ico" [class.danger]="r.danger" [innerHTML]="iconSvg(r.icon)"></span>
          <span class="set-text">
            <span class="set-label">{{ rowLabel(r) }}</span>
            <span class="set-rowsub">{{ rowSub(r) }}</span>
          </span>
          <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </ng-template>

      <app-beauty-confirm-modal
        *ngIf="showLogoutConfirm"
        [open]="showLogoutConfirm"
        [title]="'Sign out?'"
        [body]="'You\\'ll need to sign in again to manage your storefront and respond to messages.'"
        [primaryLabel]="'Sign out'" [secondaryLabel]="'Stay signed in'" [primaryVariant]="'danger'"
        [busy]="loggingOut" [busyLabel]="'Signing out…'"
        (confirmed)="logout()" (dismissed)="showLogoutConfirm = false" />

      <app-beauty-confirm-modal
        *ngIf="showDeleteConfirm"
        [open]="showDeleteConfirm"
        [title]="'Delete account?'"
        [body]="'This permanently removes your business, services, and storefront. Active bookings remain valid for the customer. This cannot be undone.'"
        [primaryLabel]="'Delete account'" [secondaryLabel]="'Keep my account'" [primaryVariant]="'danger'"
        [busy]="deleting" [busyLabel]="'Deleting…'"
        (confirmed)="deleteAccount()" (dismissed)="showDeleteConfirm = false" />
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --ink: #0A0A0B; --danger: #C0392B; --danger-soft: #FCE8E5;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .pw-shell { display: flex; min-height: 100dvh; background: var(--surface); }
    app-prov-web-sidebar { position: sticky; top: 0; height: 100dvh; }
    .pw-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    app-prov-web-topbar { position: sticky; top: 0; z-index: 5; }
    .pw-content { flex: 1; padding: 0 0 40px; }
    .pw-pad { padding: 20px 28px 0; }

    .pw-header { padding: 24px 28px 4px; }
    .pw-header-centered { text-align: center; }
    .pw-title { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 500; line-height: 1.15; }
    .pw-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 6px; }

    .web-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }
    .set-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: start; }
    .set-card { padding: 14px 8px 8px; }
    .set-eyebrow { font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); padding: 0 10px 8px; }
    .set-eyebrow.danger { color: var(--danger); }

    .set-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 10px; background: transparent; border: none; border-radius: 10px; cursor: pointer; text-align: left; font-family: var(--font-body); color: var(--text); }
    .set-row:hover:not(:disabled) { background: var(--surface); }
    .set-row:disabled { opacity: 0.55; cursor: not-allowed; }
    .set-ico { width: 34px; height: 34px; flex-shrink: 0; border-radius: 9px; background: var(--surface); display: grid; place-items: center; color: var(--text); }
    .set-ico.danger { background: var(--danger-soft); color: var(--danger); }
    .set-ico svg { width: 16px; height: 16px; }
    .set-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .set-label { font-size: 0.8125rem; font-weight: 600; }
    .set-rowsub { font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .set-row.danger .set-label { color: var(--danger); }
    .chev { color: var(--text-muted); flex-shrink: 0; }

    .msg { color: var(--accent-blue-text); font-size: 0.8125rem; }
    .msg.error { color: var(--danger); }

    @media screen and (max-width: 960px) { .set-grid { grid-template-columns: 1fr; } }
    @media screen and (max-width: 720px) {
      app-prov-web-sidebar { display: none; }
      .pw-pad { padding: 16px 16px 0; }
      .pw-header { padding: 16px; }
    }
  `],
})
export class BeautyBusinessSettingsComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  loggingOut = false;
  deleting = false;
  showLogoutConfirm = false;
  showDeleteConfirm = false;
  message = '';
  isError = false;

  constructor(private auth: BeautyAuthService) {}

  get business(): { email?: string; business_name?: string } | null {
    return (this.data['business'] as { email?: string; business_name?: string }) || null;
  }
  get initial(): string { return (this.business?.business_name || '·').trim()[0]?.toUpperCase() || '·'; }
  get navBadges(): Partial<Record<ProvWebNav, number>> {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  accountRows: MenuRow[] = [
    { label: 'Change password', sub: 'Update your sign-in password', icon: 'lock', link: 'change_password', testid: 'settings-change-password' },
    { label: 'Email & contact', sub: 'Account email & phone', icon: 'mail', link: 'email_contact' },
    { label: 'Notifications', sub: 'Push, email, SMS', icon: 'bell', soon: true },
    { label: 'Storefront preview', sub: 'See what customers see', icon: 'link', soon: true },
  ];
  businessRows: MenuRow[] = [
    { label: 'Schedule & hours', sub: 'When you are open', icon: 'clock', link: 'schedule', testid: 'settings-schedule' },
    { label: 'Services', sub: 'Add, edit, remove services', icon: 'spark', link: 'services' },
    { label: 'Payouts', sub: 'Bank & payout details', icon: 'card', soon: true },
    { label: 'Tax & compliance', sub: 'EIN & documents', icon: 'doc', soon: true },
  ];
  dangerRows: MenuRow[] = [
    { label: 'Sign out', sub: "You'll need to sign in again", icon: 'signout', danger: true, action: 'logout', testid: 'settings-logout' },
    { label: 'Delete account', sub: 'Permanently remove your storefront', icon: 'trash', danger: true, action: 'delete', testid: 'settings-delete-account' },
  ];

  private icons: Record<string, string> = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>',
    signout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  };
  iconSvg(key: string): string { return this.icons[key] || this.icons['link']; }

  rowLabel(r: MenuRow): string {
    if (r.action === 'logout') return this.loggingOut ? 'Signing out…' : 'Sign out';
    return r.label;
  }
  rowSub(r: MenuRow): string {
    if (r.label === 'Email & contact' && this.business?.email) return this.business.email;
    return r.sub;
  }
  rowDisabled(r: MenuRow): boolean {
    if (r.action === 'logout') return this.loggingOut || !this.links['logout'];
    if (r.action === 'delete') return this.deleting || !this.links['delete_account'];
    return false;  // soon rows stay enabled to show the note
  }

  onRowClick(r: MenuRow): void {
    if (r.action === 'logout') { this.askLogout(); return; }
    if (r.action === 'delete') { this.askDelete(); return; }
    if (r.soon || !r.link || !this.links[r.link]) {
      this.isError = false;
      this.message = `${r.label} is coming soon.`;
      return;
    }
    this.message = '';
    this.emit(this.links[r.link]);
  }

  emit(link: BffLink | null | undefined): void { if (link) this.followLink.emit(link); }

  askLogout(): void { if (!this.loggingOut) this.showLogoutConfirm = true; }
  askDelete(): void { if (!this.deleting) this.showDeleteConfirm = true; }

  logout(): void {
    const link = this.links['logout'];
    if (!link || this.loggingOut) return;
    this.loggingOut = true;
    this.auth.follow(link).subscribe({ next: () => this.afterLogout(), error: () => this.afterLogout() });
  }
  private afterLogout(): void {
    this.loggingOut = false; this.showLogoutConfirm = false;
    this.followLink.emit({ rel: 'home', href: null, method: 'NAV', screen: 'beauty_business_login', route: '/business/login', prompt: 'Sign in' });
  }

  deleteAccount(): void {
    const link = this.links['delete_account'];
    if (!link || this.deleting) return;
    this.deleting = true;
    this.auth.follow(link).subscribe({
      next: () => this.afterDelete(),
      error: (err) => {
        this.deleting = false; this.showDeleteConfirm = false;
        this.isError = true; this.message = err?.error?.detail || 'Could not delete account.';
      },
    });
  }
  private afterDelete(): void {
    this.deleting = false; this.showDeleteConfirm = false;
    this.followLink.emit({ rel: 'home', href: null, method: 'NAV', screen: 'beauty_home', route: '/', prompt: 'Beauty' });
  }
}
