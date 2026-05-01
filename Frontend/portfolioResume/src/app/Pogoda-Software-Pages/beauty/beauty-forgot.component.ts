/**
 * BeautyForgotComponent
 * ---------------------
 * Static "Reset password" screen matching the design system
 * AuthForgotPage. POSTs the email to the BFF reset endpoint.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { BeautyAuthService } from './beauty-auth.service';

@Component({
  selector: 'app-beauty-forgot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="forgot-page">
      <header class="back-bar">
        <button type="button" class="back-btn" (click)="back()" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      </header>

      <main id="main" class="forgot-main">
        <div class="brand">
          <div class="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
              <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
            </svg>
          </div>
          <div class="brand-name">Beauty</div>
        </div>

        <h1 class="title">Reset password</h1>
        <p class="subtitle">
          Enter the email tied to your account. We'll send a link to reset your password.
        </p>

        <form (ngSubmit)="submit()" novalidate>
          <div class="field-group">
            <label for="forgot-email" class="field-label">Email</label>
            <input
              id="forgot-email"
              type="email"
              name="email"
              class="form-input"
              [class.error]="touched && !valid()"
              placeholder="you@example.com"
              [(ngModel)]="email"
              (blur)="touched = true"
              autocomplete="email"
              [attr.aria-invalid]="touched && !valid() ? 'true' : null"
              [attr.aria-describedby]="touched && !valid() ? 'forgot-email-err' : null"
              required
            />
            <span *ngIf="touched && !valid()" id="forgot-email-err" class="field-error">
              Please enter a valid email address.
            </span>
          </div>

          <div *ngIf="serverError" class="server-error" role="alert" aria-live="assertive">{{ serverError }}</div>
          <div *ngIf="sent" class="success-msg" role="status" aria-live="polite">
            Check your inbox — we sent a reset link to <strong>{{ email }}</strong>.
          </div>

          <button type="submit" class="btn-submit" [disabled]="!valid() || loading">
            <span *ngIf="loading" class="spinner"></span>
            <ng-container *ngIf="!loading">Send reset link</ng-container>
          </button>
        </form>

        <div class="info-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a3a52" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
          <span>
            Reset links expire after 30 minutes for security.
            Check your spam folder if you don't see it.
          </span>
        </div>

        <div class="footer">
          Remembered it?
          <button type="button" class="link" (click)="back()">Back to sign in</button>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2;
      --line: #DCDCDF;
      --text: #0F1115;
      --text-muted: #6B6F77;
      --baby-blue: #CFE3F5;
      --baby-blue-deep: #7DA8CF;
      --ink: #0A0A0B;
      --success: #2F7A47;
      --success-hover: #256238;
      --danger: #C0392B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      display: block;
      min-height: 100dvh;
      background: var(--surface);
      color: var(--text);
      font-family: var(--font-body);
    }
    * { box-sizing: border-box; }

    :host *:focus-visible {
      outline: 2px solid #1a3a52;
      outline-offset: 2px;
      border-radius: 6px;
    }
    .sr-only {
      position: absolute !important; width: 1px !important; height: 1px !important;
      padding: 0 !important; margin: -1px !important; overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important;
    }
    @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }

    .forgot-page {
      display: flex; flex-direction: column;
      min-height: 100dvh; max-width: 430px; margin: 0 auto;
    }

    .back-bar {
      height: 56px; padding: 0 8px;
      display: flex; align-items: center;
      background: var(--surface);
    }
    .back-btn {
      width: 40px; height: 40px; border-radius: 8px;
      background: transparent; border: none; color: var(--text);
      display: grid; place-items: center; cursor: pointer;
    }

    .forgot-main { flex: 1; padding: 8px 24px 24px; }

    .brand { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .brand-icon {
      width: 48px; height: 48px; border-radius: 14px;
      background: var(--ink);
      display: grid; place-items: center;
    }
    .brand-name {
      font-family: var(--font-display);
      font-size: 28px; font-weight: 500; line-height: 1;
    }

    .title {
      font-family: var(--font-display); font-size: 32px; font-weight: 500;
      margin: 24px 0 4px; letter-spacing: .2px; line-height: 1.1;
    }
    .subtitle {
      font-size: 13px; color: var(--text-muted);
      margin-bottom: 24px; line-height: 1.5;
    }

    .field-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .field-label {
      font-size: 11px; font-weight: 600; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 1.2px;
    }
    .form-input {
      width: 100%; height: 44px; padding: 0 14px;
      border: 1px solid var(--line); border-radius: 10px;
      background: #fff; font-size: 14px; color: var(--text);
      outline: none; transition: border-color .15s ease, box-shadow .15s ease;
    }
    .form-input:focus {
      border-color: var(--baby-blue-deep);
      box-shadow: 0 0 0 3px rgba(125, 168, 207, 0.18);
    }
    .form-input.error { border-color: var(--danger); }
    .field-error { color: var(--danger); font-size: 11px; }

    .server-error {
      background: #FCE8E5; border: 1px solid #F4B5AE; border-radius: 10px;
      padding: 12px 14px; color: #8A2419; font-size: 13px; line-height: 1.4;
      margin-bottom: 10px;
    }
    .success-msg {
      background: #E5F3EA; border: 1px solid #B6D9C2; border-radius: 10px;
      padding: 12px 14px; color: #1F4F2E; font-size: 13px; line-height: 1.4;
      margin-bottom: 10px;
    }

    .btn-submit {
      width: 100%; height: 48px; margin-top: 4px;
      background: var(--success); color: #fff; border: 1px solid var(--success);
      border-radius: 10px;
      font-size: 14px; font-weight: 600; letter-spacing: .2px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: 0 2px 8px rgba(47, 122, 71, 0.2);
    }
    .btn-submit:hover { background: var(--success-hover); border-color: var(--success-hover); }
    .btn-submit:disabled {
      background: #D4D4D7; border-color: #D4D4D7; color: #9A9AA0;
      cursor: not-allowed; box-shadow: none;
    }

    .info-card {
      margin-top: 24px;
      padding: 14px 16px;
      background: var(--baby-blue);
      border: 1px solid rgba(125, 168, 207, 0.2);
      border-radius: 10px;
      display: flex; gap: 10px; align-items: flex-start;
      font-size: 12px; color: #1a3a52; line-height: 1.5;
    }
    .info-card svg { flex-shrink: 0; margin-top: 1px; }

    .footer {
      text-align: center; margin-top: 28px;
      font-size: 13px; color: var(--text-muted);
    }
    .link {
      background: none; border: none; padding: 0;
      color: var(--text); font-weight: 600; font-size: 13px;
      cursor: pointer;
    }
    .link:hover { color: var(--baby-blue-deep); text-decoration: underline; }

    .spinner {
      width: 18px; height: 18px;
      border: 2.5px solid rgba(255, 255, 255, 0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class BeautyForgotComponent {
  email = '';
  touched = false;
  loading = false;
  serverError = '';
  sent = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: BeautyAuthService,
  ) {}

  valid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  back(): void {
    this.router.navigate(['/pogoda/beauty/login']);
  }

  submit(): void {
    this.touched = true;
    if (!this.valid() || this.loading) return;
    this.loading = true;
    this.serverError = '';
    this.sent = false;

    const url = `${environment.apiBaseUrl}/api/beauty/auth/forgot/`;
    this.http
      .post(url, { email: this.email.trim() }, {
        withCredentials: true,
        headers: this.authService.getAuthHeaders(),
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.sent = true;
        },
        error: (err) => {
          this.loading = false;
          // Generic message — don't leak whether the email exists.
          if (err?.status === 404 || err?.status === 200) {
            this.sent = true;
          } else {
            this.serverError = 'Something went wrong. Please try again.';
          }
        },
      });
  }
}
