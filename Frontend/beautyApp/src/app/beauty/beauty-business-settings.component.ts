/**
 * BeautyBusinessSettingsComponent — redesigned per Business Provider Portal handoff (settings-1).
 * Avatar+email mini-row · Account / Business / Danger zone grouped cards · two-stage confirm modals.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyConfirmModalComponent } from './beauty-confirm-modal.component';
import { BeautyProviderSubHeaderComponent } from './provider/prov-sub-header.component';
import { BeautyProviderTabBarComponent, ProviderTab } from './provider/prov-tab-bar.component';
import { resolveTabLink } from './provider/prov-tab-nav';
import { BeautyProviderCardComponent } from './provider/prov-card.component';

interface MenuRow {
  label: string;
  sub: string;
  link?: string;
  testid?: string;
  danger?: boolean;
  action?: 'logout' | 'delete';
}

@Component({
  selector: 'app-beauty-business-settings',
  standalone: true,
  imports: [
    CommonModule,
    BeautyConfirmModalComponent,
    BeautyProviderSubHeaderComponent,
    BeautyProviderTabBarComponent,
    BeautyProviderCardComponent,
  ],
  template: `
    <div class="beauty-app prov-shell">
      <app-prov-sub-header back="Dashboard" title="Settings"
                           (backClick)="emit(links['business_home'])"></app-prov-sub-header>

      <main id="main" class="prov-body">
        <div class="email-row">
          <div class="avatar" aria-hidden="true">{{ initial }}</div>
          <span class="email-mono">{{ business?.email }}</span>
        </div>

        <div class="group-label">Account</div>
        <app-prov-card [padding]="0" class="menu-card">
          <ng-container *ngFor="let r of accountRows; let last = last">
            <ng-container *ngTemplateOutlet="rowTpl; context: {$implicit: r, last: last}"></ng-container>
          </ng-container>
        </app-prov-card>

        <div class="group-label">Business</div>
        <app-prov-card [padding]="0" class="menu-card">
          <ng-container *ngFor="let r of businessRows; let last = last">
            <ng-container *ngTemplateOutlet="rowTpl; context: {$implicit: r, last: last}"></ng-container>
          </ng-container>
        </app-prov-card>

        <div class="group-label">Danger zone</div>
        <app-prov-card [padding]="0" class="menu-card">
          <ng-container *ngFor="let r of dangerRows; let last = last">
            <ng-container *ngTemplateOutlet="rowTpl; context: {$implicit: r, last: last}"></ng-container>
          </ng-container>
        </app-prov-card>

        <p *ngIf="message" class="msg" [class.error]="isError"
           [attr.role]="isError ? 'alert' : 'status'" aria-live="polite">{{ message }}</p>
      </main>

      <ng-template #rowTpl let-r let-last="last">
        <button type="button" class="menu-row" [class.last]="last" [class.danger]="r.danger"
                [attr.data-testid]="r.testid"
                [disabled]="rowDisabled(r)"
                (click)="onRowClick(r)">
          <div class="row-text">
            <div class="row-label">{{ rowLabel(r) }}</div>
            <div class="row-sub">{{ r.sub }}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </ng-template>

      <app-prov-tab-bar active="profile" [badges]="tabBadges" (tabClick)="onTab($event)"></app-prov-tab-bar>

      <app-beauty-confirm-modal
        *ngIf="showLogoutConfirm"
        [open]="showLogoutConfirm"
        [title]="'Sign out?'"
        [body]="'You\\'ll need to sign in again to manage your storefront and respond to messages.'"
        [primaryLabel]="'Sign out'"
        [secondaryLabel]="'Stay signed in'"
        [primaryVariant]="'danger'"
        [busy]="loggingOut"
        [busyLabel]="'Signing out…'"
        (confirmed)="logout()"
        (dismissed)="showLogoutConfirm = false"
      />

      <app-beauty-confirm-modal
        *ngIf="showDeleteConfirm"
        [open]="showDeleteConfirm"
        [title]="'Delete account?'"
        [body]="'This permanently removes your business, services, and storefront. Active bookings remain valid for the customer. This cannot be undone.'"
        [primaryLabel]="'Delete account'"
        [secondaryLabel]="'Keep my account'"
        [primaryVariant]="'danger'"
        [busy]="deleting"
        [busyLabel]="'Deleting…'"
        (confirmed)="deleteAccount()"
        (dismissed)="showDeleteConfirm = false"
      />
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --danger: #C0392B;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
      background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .prov-shell {
      display: flex; flex-direction: column;
      min-height: 100vh;
      background: var(--surface); color: var(--text);
      font-family: var(--font-body);
    }
    .prov-body { flex: 1; padding: 14px 16px; overflow-y: auto; }

    .email-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 4px 14px;
    }
    .avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #BFD8EE, #7DA8CF);
      display: grid; place-items: center;
      font-family: var(--font-display);
      font-size: 15px; font-weight: 500;
      color: #1a3a52;
    }
    .email-mono {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-muted);
    }

    .group-label {
      font-size: 10px; font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 1.2px; text-transform: uppercase;
      margin-bottom: 8px;
      padding-left: 4px;
    }
    .menu-card { display: block; overflow: hidden; margin-bottom: 14px; }

    .menu-row {
      display: flex; align-items: center; gap: 12px;
      width: 100%;
      padding: 14px 16px;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--line);
      cursor: pointer;
      text-align: left;
      font-family: var(--font-body);
      min-height: 44px;
      color: var(--text);
    }
    .menu-row.last { border-bottom: none; }
    .menu-row[disabled] { opacity: 0.5; cursor: not-allowed; }
    .row-text { flex: 1; }
    .row-label { font-size: 13px; font-weight: 600; color: var(--text); }
    .row-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    .menu-row.danger { color: var(--danger); }
    .menu-row.danger .row-label { color: var(--danger); }

    .msg { padding: 12px 0; color: #1a3a52; font-size: 13px; }
    .msg.error { color: var(--danger); }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
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

  get initial(): string {
    return (this.business?.business_name || '·').trim()[0]?.toUpperCase() || '·';
  }

  get tabBadges(): { bookings?: number; messages?: number } {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  accountRows: MenuRow[] = [
    { label: 'Change password', sub: 'Update your sign-in password', link: 'change_password', testid: 'settings-change-password' },
    { label: 'Email & contact', sub: 'Account email', link: 'email_contact' },
    { label: 'Storefront preview', sub: 'See what customers see', link: 'storefront_preview' },
  ];
  businessRows: MenuRow[] = [
    { label: 'Schedule', sub: 'Set when you are open and closed', link: 'schedule', testid: 'settings-schedule' },
    { label: 'Services', sub: 'Add, edit, remove services', link: 'services' },
    { label: 'Notifications', sub: 'Email & push preferences', link: 'notifications' },
  ];
  dangerRows: MenuRow[] = [
    { label: 'Sign out', sub: 'End this session', danger: true, action: 'logout', testid: 'settings-logout' },
    { label: 'Delete account', sub: 'Permanently remove this business', danger: true, action: 'delete', testid: 'settings-delete-account' },
  ];

  rowLabel(r: MenuRow): string {
    if (r.action === 'logout') return this.loggingOut ? 'Signing out…' : 'Sign out';
    if (r.label === 'Email & contact') return 'Email & contact';
    return r.label;
  }

  rowDisabled(r: MenuRow): boolean {
    if (r.action === 'logout') return this.loggingOut || !this.links['logout'];
    if (r.action === 'delete') return this.deleting || !this.links['delete_account'];
    if (r.link) return !this.links[r.link];
    return false;
  }

  onRowClick(r: MenuRow): void {
    if (r.action === 'logout') { this.askLogout(); return; }
    if (r.action === 'delete') { this.askDelete(); return; }
    if (r.link) this.emit(this.links[r.link]);
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  onTab(tab: ProviderTab): void {
    this.emit(resolveTabLink(tab, this.links));
  }

  askLogout(): void {
    if (this.loggingOut) return;
    this.showLogoutConfirm = true;
  }
  askDelete(): void {
    if (this.deleting) return;
    this.showDeleteConfirm = true;
  }

  logout(): void {
    const link = this.links['logout'];
    if (!link || this.loggingOut) return;
    this.loggingOut = true;
    this.auth.follow(link).subscribe({
      next: () => this.afterLogout(),
      error: () => this.afterLogout(),
    });
  }

  private afterLogout(): void {
    this.loggingOut = false;
    this.showLogoutConfirm = false;
    this.followLink.emit({
      rel: 'home', href: null, method: 'NAV',
      screen: 'beauty_business_login', route: '/business/login', prompt: 'Sign in',
    });
  }

  deleteAccount(): void {
    const link = this.links['delete_account'];
    if (!link || this.deleting) return;
    this.deleting = true;
    this.auth.follow(link).subscribe({
      next: () => this.afterDelete(),
      error: (err) => {
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.isError = true;
        this.message = err?.error?.detail || 'Could not delete account.';
      },
    });
  }

  private afterDelete(): void {
    this.deleting = false;
    this.showDeleteConfirm = false;
    this.followLink.emit({
      rel: 'home', href: null, method: 'NAV',
      screen: 'beauty_home', route: '/', prompt: 'Beauty',
    });
  }
}
