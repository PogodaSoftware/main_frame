/**
 * AdminPortalSignInComponent — `/admin/portal/signin`
 *
 * Desktop admin sign-in. Matches the `web-auth-signin` artboard (slate
 * split-pane). The form submit follows the BFF `submit` link (a POST to the
 * existing customer login endpoint), after which the resolver decides whether
 * to advance to /admin/portal/2fa (admin allowlist match) or bounce back with
 * an error. RN remains the mobile shell; this is the desktop build.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import { BeautyAdminWebAuthLayoutComponent } from '../admin-web/admin-web-auth-layout.component';

@Component({
  selector: 'app-admin-portal-signin',
  standalone: true,
  imports: [CommonModule, FormsModule, BeautyAdminWebAuthLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-web-auth-layout
      eyebrow="Admin sign-in"
      title="Welcome back."
      sub="This is an internal tool. Sessions are recorded, every action is audited, and IP allowlists are enforced."
      footerNote="No account? Admins are invited only — talk to Maria or Daniel.">
      <form class="aw-card" (ngSubmit)="submit()" novalidate>
        <h2 class="aw-h2">Sign in to Admin</h2>
        <div class="aw-cardsub">Use your beauty.io email and password.</div>

        <label class="aw-label" for="adm-signin-email">Email</label>
        <input id="adm-signin-email" class="aw-input mono" name="email" type="email"
               autocomplete="email" inputmode="email" placeholder="you@beauty.io"
               [(ngModel)]="email" />

        <label class="aw-label" for="adm-signin-pw">Password</label>
        <div class="aw-inputwrap">
          <input id="adm-signin-pw" class="aw-input" name="password"
                 [type]="showPw ? 'text' : 'password'" autocomplete="current-password"
                 placeholder="••••••••••••" [(ngModel)]="password" />
          <button type="button" class="aw-suffix" (click)="showPw = !showPw"
                  [attr.aria-pressed]="showPw" aria-label="Toggle password visibility">
            {{ showPw ? 'hide' : 'show' }}
          </button>
        </div>

        <div class="aw-row">
          <label class="aw-remember">
            <input type="checkbox" /> Remember this device for 7 days
          </label>
          <a href="#" class="aw-link" (click)="onMagic($event)">Use magic link →</a>
        </div>

        <div class="aw-err" role="alert" *ngIf="errorMessage">{{ errorMessage }}</div>

        <button type="submit" class="aw-primary">Continue to 2FA</button>
      </form>
    </app-admin-web-auth-layout>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; }
    * { box-sizing: border-box; }
    .aw-card {
      background: #fff; border: 1px solid #DCDCDF; border-radius: 14px; padding: 28px;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .aw-h2 { margin: 0 0 4px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.625rem; font-weight: 500; color: #0F1115; line-height: 1.1; }
    .aw-cardsub { font-size: 0.75rem; color: #6B6F77; margin-bottom: 22px; }
    .aw-label { display: block; font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #6B6F77; margin: 0 0 6px; }
    .aw-input {
      width: 100%; height: 44px; border: 1px solid #DCDCDF; border-radius: 10px; padding: 0 12px;
      font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; color: #0F1115; background: #fff; outline: none;
      margin-bottom: 14px;
    }
    .aw-input.mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
    .aw-input:focus { border-color: #0F1115; }
    .aw-inputwrap { position: relative; }
    .aw-suffix { position: absolute; right: 10px; top: 11px; background: transparent; border: none; color: #6B6F77; cursor: pointer; font-family: ui-monospace, monospace; font-size: 0.6875rem; padding: 4px 6px; }
    .aw-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
    .aw-remember { display: inline-flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #6B6F77; cursor: pointer; }
    .aw-remember input { width: 16px; height: 16px; }
    .aw-link { font-size: 0.75rem; color: #0F1115; font-weight: 600; text-decoration: none; cursor: pointer; }
    .aw-err { background: #FCE8E5; border: 1px solid rgba(178,58,45,0.30); color: #C0392B; border-radius: 10px; padding: 10px 12px; font-size: 0.8125rem; margin-bottom: 14px; }
    .aw-primary {
      width: 100%; height: 48px; border-radius: 10px; background: #0F1115; color: #fff; border: 1px solid #0F1115;
      font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; font-weight: 600; cursor: pointer;
    }
    .aw-primary:hover { background: #000; }
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
