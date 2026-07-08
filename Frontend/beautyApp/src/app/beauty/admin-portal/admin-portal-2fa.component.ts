/**
 * AdminPortal2FAComponent — `/admin/portal/2fa`
 *
 * Slate-themed 6-digit TOTP entry. Matches the `auth-2fa` artboard.
 *
 * Visual-only in this pass: the component renders 6 digit cells with the
 * focused position highlighted. Real TOTP verification ships with the
 * BeautyAdminTotpSecret model in a later iteration; for now submit forwards
 * to the dashboard via the BFF `submit` link.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import { BeautyAdminWebAuthLayoutComponent } from '../admin-web/admin-web-auth-layout.component';

@Component({
  selector: 'app-admin-portal-2fa',
  standalone: true,
  imports: [CommonModule, FormsModule, BeautyAdminWebAuthLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-web-auth-layout
      eyebrow="Two-factor authentication"
      title="One more step."
      sub="Enter the 6-digit code from your authenticator app. Codes refresh every 30 seconds."
      footerNote="Lost your authenticator? Use a backup code or magic-link sign-in.">
      <div class="aw-card">
        <h2 class="aw-h2">Enter your code</h2>
        <div class="aw-cardsub">From Authy, 1Password, or your provisioned authenticator.</div>

        <div class="digits" role="group" aria-label="6-digit verification code">
          <label class="sr-only" for="totp-input">Verification code</label>
          <input id="totp-input" #totpInput class="sr-only" inputmode="numeric" autocomplete="one-time-code"
                 maxlength="6" pattern="[0-9]{6}" [(ngModel)]="code"
                 (input)="onCode($event)" />
          <div class="cell" *ngFor="let i of cells; let idx = index"
               [class.is-on]="digit(idx)"
               [class.is-focus]="idx === focusIndex"
               (click)="totpInput.focus()">{{ digit(idx) || '·' }}</div>
        </div>

        <div class="meta">
          <span>Code expires in <span class="mono on">{{ countdown }}</span></span>
          <a href="#" class="aw-link" (click)="onLink($event, 'magic')">Use backup code</a>
        </div>

        <div class="aw-err" role="alert" *ngIf="errorMessage">{{ errorMessage }}</div>

        <button type="button" class="aw-primary" [disabled]="code.length !== 6" (click)="onVerify()">
          Verify &amp; sign in
        </button>

        <div class="recover">
          Not you? <a href="#" class="aw-link" (click)="onLink($event, 'back')">Back to sign-in</a>
        </div>
      </div>
    </app-admin-web-auth-layout>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; }
    * { box-sizing: border-box; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
    .aw-card { background: #fff; border: 1px solid #DCDCDF; border-radius: 14px; padding: 28px; font-family: 'Inter', system-ui, sans-serif; }
    .aw-h2 { margin: 0 0 4px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.625rem; font-weight: 500; color: #0F1115; line-height: 1.1; }
    .aw-cardsub { font-size: 0.75rem; color: #6B6F77; margin-bottom: 22px; }

    .digits { display: flex; gap: 8px; margin-bottom: 14px; }
    .cell {
      flex: 1; height: 60px; border-radius: 10px; border: 1.5px solid #DCDCDF; background: #fff;
      display: grid; place-items: center; font-family: ui-monospace, 'SF Mono', Menlo, monospace;
      font-size: 1.625rem; font-weight: 600; color: #CFCFD3; line-height: 1; cursor: text;
    }
    .cell.is-on { color: #0F1115; border-color: #0F1115; }
    .cell.is-focus { border-color: #0F1115; box-shadow: 0 0 0 2px rgba(15,17,21,0.12); }

    .meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; font-size: 0.75rem; color: #6B6F77; font-family: ui-monospace, monospace; }
    .meta .mono.on { color: #0F1115; font-weight: 700; }
    .aw-link { color: #0F1115; font-weight: 600; text-decoration: none; cursor: pointer; font-family: 'Inter', system-ui, sans-serif; }

    .aw-err { background: #FCE8E5; border: 1px solid rgba(178,58,45,0.30); color: #C0392B; border-radius: 10px; padding: 10px 12px; font-size: 0.8125rem; margin-bottom: 14px; }

    .aw-primary { width: 100%; height: 48px; border-radius: 10px; background: #0F1115; color: #fff; border: 1px solid #0F1115; font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
    .aw-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .aw-primary:not(:disabled):hover { background: #000; }

    .recover { text-align: center; margin-top: 14px; font-size: 0.75rem; color: #6B6F77; }
  `],
})
export class AdminPortal2FAComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Input() errorMessage: string | null = null;
  @Output() verify = new EventEmitter<string>();
  @Output() followLink = new EventEmitter<BffLink>();

  cells = Array.from({ length: 6 });
  code = '4291';
  countdown = '00:24';

  get focusIndex(): number {
    return Math.min(this.code.length, 5);
  }

  digit(idx: number): string {
    return this.code[idx] ?? '';
  }

  onCode(ev: Event): void {
    const t = ev.target as HTMLInputElement;
    this.code = t.value.replace(/\D/g, '').slice(0, 6);
  }

  onVerify(): void {
    if (this.code.length !== 6) return;
    this.verify.emit(this.code);
  }

  onLink(ev: Event, rel: string): void {
    ev.preventDefault();
    const link = this.links[rel];
    if (link) this.followLink.emit(link);
  }
}
