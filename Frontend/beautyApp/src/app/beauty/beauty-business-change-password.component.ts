/**
 * BeautyBusinessChangePasswordComponent — redesigned per Business Provider Portal handoff (pw-1).
 * Form card with Current + New password + 4-segment strength meter + filled "Update password" button.
 */

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyProviderSubHeaderComponent } from './provider/prov-sub-header.component';
import { BeautyProviderCardComponent } from './provider/prov-card.component';
import { BeautyProviderButtonComponent } from './provider/prov-btn.component';

@Component({
  selector: 'app-beauty-business-change-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BeautyProviderSubHeaderComponent,
    BeautyProviderCardComponent,
    BeautyProviderButtonComponent,
  ],
  template: `
    <div class="beauty-app prov-shell">
      <app-prov-sub-header back="Settings" title="Change password"
                           (backClick)="emit(links['settings'])"></app-prov-sub-header>

      <main id="main" class="prov-body">
        <app-prov-card [padding]="16" class="card">
          <form (ngSubmit)="submit()" #f="ngForm" novalidate>
            <div class="field">
              <label class="lab" for="current_password">Current password<span class="req">*</span></label>
              <input id="current_password"
                     type="password"
                     name="current_password"
                     autocomplete="current-password"
                     class="form-input"
                     [(ngModel)]="currentPassword"
                     required
                     data-testid="current-password"/>
            </div>

            <div class="field">
              <label class="lab" for="new_password">New password<span class="req">*</span></label>
              <input id="new_password"
                     type="password"
                     name="new_password"
                     autocomplete="new-password"
                     minlength="8"
                     class="form-input"
                     [(ngModel)]="newPassword"
                     required
                     data-testid="new-password"
                     placeholder="At least 8 characters"/>
              <div class="strength" *ngIf="newPassword">
                <div class="seg" *ngFor="let s of [0,1,2,3]"
                     [class.on-strong]="s < strengthScore && strengthScore >= 3"
                     [class.on-mid]="s < strengthScore && strengthScore < 3"></div>
              </div>
              <div class="strength-hint" *ngIf="newPassword">{{ strengthLabel }}</div>
            </div>

            <app-prov-btn variant="primary" type="submit" [full]="true" size="lg" [disabled]="busy">
              {{ busy ? 'Saving…' : 'Update password' }}
            </app-prov-btn>
          </form>
        </app-prov-card>

        <p *ngIf="message" class="msg" [class.error]="isError"
           [attr.role]="isError ? 'alert' : 'status'" aria-live="polite"
           data-testid="change-password-msg">{{ message }}</p>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --success: #2F7A47; --danger: #C0392B;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
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
    .prov-body { flex: 1; padding: 20px 16px; overflow-y: auto; }
    .card { display: block; }

    .field { margin-bottom: 14px; }
    .lab {
      display: block;
      font-size: 11px; font-weight: 600;
      letter-spacing: 0.6px; text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .req { color: var(--danger); margin-left: 3px; }
    .form-input {
      width: 100%; box-sizing: border-box;
      height: 44px; padding: 0 12px;
      background: #FFFFFF;
      border: 1px solid var(--line);
      border-radius: 10px;
      font-family: var(--font-body);
      font-size: 14px;
      color: var(--text);
      outline: none;
    }

    .strength {
      display: flex; gap: 6px;
      margin-top: 8px;
    }
    .seg {
      flex: 1; height: 4px;
      border-radius: 2px;
      background: var(--line);
    }
    .seg.on-strong { background: var(--success); }
    .seg.on-mid { background: #E5BE5C; }
    .strength-hint {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 6px;
    }

    .msg { padding: 12px 0; color: #1a3a52; font-size: 13px; }
    .msg.error { color: var(--danger); }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
  `],
})
export class BeautyBusinessChangePasswordComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  currentPassword = '';
  newPassword = '';
  busy = false;
  message = '';
  isError = false;

  constructor(private auth: BeautyAuthService) {}

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

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  submit(): void {
    if (this.busy) return;
    this.message = '';
    this.isError = false;

    if (!this.currentPassword || !this.newPassword) {
      this.isError = true;
      this.message = 'Both fields are required.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.isError = true;
      this.message = 'New password must be at least 8 characters.';
      return;
    }

    const submit: BffLink = {
      rel: 'submit',
      href: (this.data['submit_href'] as string) || '/api/beauty/protected/business/account/password/',
      method: ((this.data['submit_method'] as string) || 'POST') as BffLink['method'],
      screen: null, route: null, prompt: null,
    };

    this.busy = true;
    this.auth.follow(submit, {
      current_password: this.currentPassword,
      new_password: this.newPassword,
    }).subscribe({
      next: () => {
        this.busy = false;
        this.message = 'Password updated.';
        this.currentPassword = '';
        this.newPassword = '';
      },
      error: (err) => {
        this.busy = false;
        this.isError = true;
        this.message = err?.error?.detail || 'Could not change password.';
      },
    });
  }
}
