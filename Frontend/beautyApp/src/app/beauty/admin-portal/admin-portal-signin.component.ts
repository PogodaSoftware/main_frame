/**
 * AdminPortalSignInComponent — `/admin/portal/signin`
 *
 * Slate-themed admin sign-in screen. Matches the `auth-signin` artboard from
 * the Claude Design Admin Portal handoff (390 × 844). The form submit follows
 * the BFF `submit` link (a POST to the existing customer login endpoint),
 * after which the resolver decides whether to advance to /admin/portal/2fa
 * (admin allowlist match) or bounce to /admin/portal/signin with an error.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import {
  AdmStatusBarComponent,
  AdmHomeIndicatorComponent,
  AdmBrandRowComponent,
  AdmBtnComponent,
} from './atoms';

@Component({
  selector: 'app-admin-portal-signin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdmStatusBarComponent,
    AdmHomeIndicatorComponent,
    AdmBrandRowComponent,
    AdmBtnComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-app adm-signin">
      <adm-status-bar tone="slate"></adm-status-bar>

      <section class="hero">
        <adm-brand-row></adm-brand-row>
        <div class="eyebrow adm-eyebrow">Admin sign-in</div>
        <h1 class="title adm-display">Sign in to admin</h1>
        <p class="sub">
          Restricted access. Activity is logged for audit. Connect through the
          company VPN if signing in from a new network.
        </p>
      </section>

      <main class="body" role="main">
        <form (ngSubmit)="submit()" novalidate>
          <label class="label adm-eyebrow" for="adm-signin-email">Work email</label>
          <div class="input">
            <input id="adm-signin-email" name="email" type="email" autocomplete="email" inputmode="email"
                   placeholder="you@beauty.io" [(ngModel)]="email" />
          </div>

          <label class="label adm-eyebrow" for="adm-signin-pw">Password</label>
          <div class="input">
            <input id="adm-signin-pw" name="password" [type]="showPw ? 'text' : 'password'"
                   autocomplete="current-password" placeholder="••••••••••" [(ngModel)]="password" />
            <button type="button" class="suffix" (click)="showPw = !showPw"
                    [attr.aria-pressed]="showPw" aria-label="Toggle password visibility">
              {{ showPw ? 'hide' : 'show' }}
            </button>
          </div>

          <div class="notice" role="status">
            <span class="ico" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            </span>
            <div>
              <div class="ntitle">New device detected</div>
              <div class="nbody">A 2FA code will be required after password. IP allowlist: 198.51.100.0/24</div>
            </div>
          </div>

          <div class="server-err" role="alert" *ngIf="errorMessage">{{ errorMessage }}</div>

          <adm-btn variant="slatePrimary" size="lg" [full]="true" type="submit">Continue →</adm-btn>

          <div class="magic">
            <a href="#" (click)="onMagic($event)">Use magic link →</a>
          </div>

          <div class="invite-info">
            Admin accounts are invite-only. No self-registration, no password reset.
            Lost access? Ask an Owner to re-invite you from
            <span class="mono">/admin/team</span>.
          </div>
        </form>
      </main>

      <footer class="foot">
        <span class="lock" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </span>
        <span class="mono">beauty.io/admin/login · v2.4.1</span>
      </footer>

      <adm-home-indicator tone="slate"></adm-home-indicator>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--adm-slate); }
    .adm-signin { min-height: 100dvh; }

    .hero { padding: 20px 24px 24px; color: #fff; }
    .hero .eyebrow { margin: 28px 0 8px; }
    .hero .title { margin: 0; font-size: 32px; color: #fff; line-height: 1.1; }
    .hero .sub { margin-top: 8px; font-size: 13px; color: var(--adm-slate-muted); max-width: 320px; line-height: 1.5; }

    .body { flex: 1; padding: 8px 24px 0; }
    .label { display: block; margin-bottom: 6px; font-size: 10px; letter-spacing: 1.4px; }
    .input { display: flex; align-items: center; background: var(--adm-slate-2); border: 1px solid var(--adm-slate-line); border-radius: 12px; height: 48px; padding: 0 14px; margin-bottom: 14px; }
    .input input { flex: 1; border: none; outline: none; background: transparent; color: #fff; font-size: 14px; font-family: var(--adm-font-body); }
    .input input::placeholder { color: var(--adm-slate-muted); }
    .suffix { background: transparent; border: none; color: var(--adm-slate-muted); cursor: pointer; font-family: var(--adm-font-mono); font-size: 11px; padding: 4px 6px; }

    .notice { background: rgba(255,196,0,0.10); border: 1px solid rgba(255,196,0,0.20); border-radius: 10px; padding: 10px 12px; display: flex; gap: 10px; align-items: flex-start; margin-bottom: 14px; color: #FFD27A; }
    .notice .ico { margin-top: 1px; flex-shrink: 0; color: #FFD27A; }
    .ntitle { font-size: 12px; font-weight: 600; color: #fff; margin-bottom: 2px; }
    .nbody { font-size: 11px; line-height: 1.5; }

    .server-err { background: rgba(178,58,45,0.12); border: 1px solid rgba(178,58,45,0.30); color: #FCC2B7; border-radius: 10px; padding: 10px 12px; font-size: 12px; margin-bottom: 14px; }

    .magic { display: flex; justify-content: flex-end; margin-top: 14px; font-size: 12px; }
    .magic a { color: #fff; text-decoration: underline; text-underline-offset: 3px; opacity: 0.85; }

    .invite-info { margin-top: 14px; padding: 8px 10px; background: var(--adm-slate-2); border: 1px solid var(--adm-slate-line); border-radius: 8px; font-size: 10.5px; color: var(--adm-slate-muted); line-height: 1.5; }
    .invite-info .mono { font-family: var(--adm-font-mono); color: #fff; }

    .foot { padding: 16px 24px 18px; border-top: 1px solid var(--adm-slate-line); background: var(--adm-slate); display: flex; align-items: center; gap: 8px; color: var(--adm-slate-muted); }
    .foot .mono { font-family: var(--adm-font-mono); font-size: 10px; }
    .foot .lock { color: var(--adm-slate-muted); }
  `],
})
export class AdminPortalSignInComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Input() errorMessage: string | null = null;
  @Output() submitLogin = new EventEmitter<{ email: string; password: string }>();
  @Output() followLink = new EventEmitter<BffLink>();

  email = '';
  password = '';
  showPw = false;

  submit(): void {
    this.submitLogin.emit({ email: this.email.trim(), password: this.password });
  }

  onMagic(ev: Event): void {
    ev.preventDefault();
    const link = this.links['magic'];
    if (link) this.followLink.emit(link);
  }
}
