/**
 * BeautyBusinessChangePasswordComponent — desktop redesign per Business
 * Provider Portal · Web handoff (web-pw). Sidebar/topbar chrome, breadcrumb +
 * centered title, two columns: form card (current / new + 4-seg strength
 * meter / confirm + Update password) and a Password tips rail. Submits via
 * the BFF-supplied action-link.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyProvWebSidebarComponent, ProvWebNav } from './prov-web/prov-web-sidebar.component';
import { BeautyProvWebTopbarComponent } from './prov-web/prov-web-topbar.component';

@Component({
  selector: 'app-beauty-business-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, BeautyProvWebSidebarComponent, BeautyProvWebTopbarComponent],
  template: `
    <div class="pw-shell">
      <app-prov-web-sidebar
        active="settings"
        [businessName]="business?.business_name || 'Your storefront'"
        [email]="business?.email || ''"
        [storefrontLive]="true" [badges]="navBadges" (follow)="emit($event)">
      </app-prov-web-sidebar>

      <div class="pw-main">
        <app-prov-web-topbar
          [businessName]="business?.business_name || 'Your storefront'"
          [email]="business?.email || ''" [notifCount]="0" (follow)="emit($event)">
        </app-prov-web-topbar>

        <main id="main" class="pw-content">
          <div class="pw-header">
            <div class="pw-header-text pw-header-centered">
              <div class="pw-crumb">
                <button type="button" class="crumb-link" (click)="emit(links['settings'])">Settings</button>
                <span class="crumb-sep">›</span> Change password
              </div>
              <h1 class="pw-title">Change password</h1>
              <div class="pw-sub">At least 12 characters, with a mix of upper, lower, number and symbol.</div>
            </div>
          </div>

          <div class="pw-pad set-grid">
            <div class="web-card form-card">
              <form (ngSubmit)="submit()" novalidate>
                <div class="field">
                  <label class="lab" for="current_password">Current password<span class="req">*</span></label>
                  <input id="current_password" type="password" name="current_password" autocomplete="current-password"
                         class="form-input" [(ngModel)]="currentPassword" required data-testid="current-password"/>
                </div>

                <div class="field">
                  <label class="lab" for="new_password">New password<span class="req">*</span></label>
                  <input id="new_password" type="password" name="new_password" autocomplete="new-password"
                         class="form-input" [(ngModel)]="newPassword" required data-testid="new-password"
                         placeholder="At least 12 characters"/>
                  <div class="strength" *ngIf="newPassword">
                    <div class="seg" *ngFor="let s of [0,1,2,3]"
                         [class.on-strong]="s < strengthScore && strengthScore >= 3"
                         [class.on-mid]="s < strengthScore && strengthScore < 3"></div>
                  </div>
                  <div class="strength-hint" *ngIf="newPassword">{{ strengthLabel }}</div>
                </div>

                <div class="field">
                  <label class="lab" for="confirm_password">Confirm new password<span class="req">*</span></label>
                  <input id="confirm_password" type="password" name="confirm_password" autocomplete="new-password"
                         class="form-input" [(ngModel)]="confirmPassword" required data-testid="confirm-password"/>
                </div>

                <button type="submit" class="wbtn wbtn-success" [disabled]="busy">
                  {{ busy ? 'Saving…' : 'Update password' }}
                </button>
                <p *ngIf="message" class="msg" [class.error]="isError"
                   [attr.role]="isError ? 'alert' : 'status'" aria-live="polite" data-testid="change-password-msg">{{ message }}</p>
              </form>
            </div>

            <aside class="web-card rail-card">
              <div class="rail-eyebrow">Password tips</div>
              <ul class="tips">
                <li>Use 12 or more characters.</li>
                <li>Mix upper, lower, numbers and symbols.</li>
                <li>Don't reuse passwords across other services.</li>
                <li>Consider a password manager.</li>
              </ul>
            </aside>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue-text: #1a3a52; --success: #2F7A47; --danger: #C0392B;
      --font-body: 'Inter', system-ui, sans-serif; --font-display: 'Cormorant Garamond', Georgia, serif;
      display: block; background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .pw-shell { display: flex; min-height: 100dvh; background: var(--surface); }
    app-prov-web-sidebar { position: sticky; top: 0; height: 100dvh; }
    .pw-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    app-prov-web-topbar { position: sticky; top: 0; z-index: 5; }
    .pw-content { flex: 1; padding: 0 0 40px; }
    .pw-pad { padding: 20px 28px 28px; }
    .pw-header { padding: 24px 28px 4px; }
    .pw-header-centered { text-align: center; }
    .pw-crumb { font-size: 0.6875rem; color: var(--text-muted); font-weight: 600; margin-bottom: 6px; text-align: left; }
    .crumb-link { background: none; border: none; padding: 0; cursor: pointer; font: inherit; color: var(--text-muted); }
    .crumb-link:hover { color: var(--accent-blue-text); text-decoration: underline; }
    .crumb-sep { margin: 0 4px; }
    .pw-title { margin: 0; font-family: var(--font-display); font-size: 2rem; font-weight: 500; line-height: 1.15; }
    .pw-sub { font-size: 0.8125rem; color: var(--text-muted); margin-top: 6px; }

    .web-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }
    .set-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
    .form-card { padding: 20px; max-width: 520px; }

    .field { margin-bottom: 16px; }
    .lab { display: block; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; }
    .req { color: var(--danger); margin-left: 3px; }
    .form-input { width: 100%; box-sizing: border-box; height: 44px; padding: 0 12px; background: #fff; border: 1px solid var(--line); border-radius: 10px; font-family: var(--font-body); font-size: 0.875rem; color: var(--text); outline: none; }
    .strength { display: flex; gap: 6px; margin-top: 8px; }
    .seg { flex: 1; height: 4px; border-radius: 2px; background: var(--line); }
    .seg.on-strong { background: var(--success); }
    .seg.on-mid { background: #E5BE5C; }
    .strength-hint { font-size: 0.6875rem; color: var(--text-muted); margin-top: 6px; }

    .wbtn { height: 44px; padding: 0 20px; border-radius: 10px; cursor: pointer; font-family: var(--font-body); font-size: 0.875rem; font-weight: 600; border: 1px solid transparent; }
    .wbtn:disabled { opacity: 0.5; cursor: not-allowed; }
    .wbtn-success { background: var(--success); color: #fff; border-color: var(--success); }
    .wbtn-success:hover:not(:disabled) { background: #276539; }

    .rail-card { padding: 16px; }
    .rail-eyebrow { font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; }
    .tips { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px; }
    .tips li { font-size: 0.75rem; color: var(--text-muted); line-height: 1.5; }

    .msg { padding: 12px 0 0; color: var(--accent-blue-text); font-size: 0.8125rem; }
    .msg.error { color: var(--danger); }

    @media screen and (max-width: 900px) { .set-grid { grid-template-columns: 1fr; } .rail-card { order: -1; } }
    @media screen and (max-width: 720px) { app-prov-web-sidebar { display: none; } .pw-header { padding: 16px; } .pw-pad { padding: 16px; } }
  `],
})
export class BeautyBusinessChangePasswordComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  busy = false;
  message = '';
  isError = false;

  constructor(private auth: BeautyAuthService) {}

  get business(): { email?: string; business_name?: string } | null {
    return (this.data['business'] as { email?: string; business_name?: string }) || null;
  }
  get navBadges(): Partial<Record<ProvWebNav, number>> {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  get strengthScore(): number {
    const p = this.newPassword || '';
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
    return Math.min(score, 4);
  }
  get strengthLabel(): string {
    const s = this.strengthScore;
    if (s <= 1) return 'Weak password — add length and variety.';
    if (s === 2) return 'Okay — could be stronger.';
    if (s === 3) return 'Good password.';
    return 'Strong password — looks good.';
  }

  emit(link: BffLink | null | undefined): void { if (link) this.followLink.emit(link); }

  submit(): void {
    if (this.busy) return;
    this.message = ''; this.isError = false;

    if (!this.currentPassword || !this.newPassword) {
      this.isError = true; this.message = 'Both fields are required.'; return;
    }
    if (this.newPassword.length < 8) {
      this.isError = true; this.message = 'New password must be at least 8 characters.'; return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.isError = true; this.message = 'New password and confirmation do not match.'; return;
    }

    const submit: BffLink = {
      rel: 'submit',
      href: (this.data['submit_href'] as string) || '/api/beauty/protected/business/account/password/',
      method: ((this.data['submit_method'] as string) || 'POST') as BffLink['method'],
      screen: null, route: null, prompt: null,
    };

    this.busy = true;
    this.auth.follow(submit, { current_password: this.currentPassword, new_password: this.newPassword }).subscribe({
      next: () => {
        this.busy = false; this.message = 'Password updated.';
        this.currentPassword = ''; this.newPassword = ''; this.confirmPassword = '';
      },
      error: (err) => {
        this.busy = false; this.isError = true;
        this.message = err?.error?.detail || 'Could not change password.';
      },
    });
  }
}
