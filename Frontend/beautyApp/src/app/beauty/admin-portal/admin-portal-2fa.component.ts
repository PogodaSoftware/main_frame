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
import {
  AdmStatusBarComponent,
  AdmHomeIndicatorComponent,
  AdmBrandRowComponent,
  AdmBtnComponent,
} from './atoms';

@Component({
  selector: 'app-admin-portal-2fa',
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
    <div class="adm-app adm-2fa">
      <adm-status-bar tone="slate"></adm-status-bar>

      <section class="hero">
        <adm-brand-row></adm-brand-row>
        <div class="eyebrow adm-eyebrow">Step 2 of 2</div>
        <h1 class="title adm-display">Verify it's you</h1>
        <p class="sub">Open your authenticator app and enter the 6-digit code for Beauty Admin.</p>
      </section>

      <main class="body" role="main">
        <div class="digits" role="group" aria-label="6-digit verification code">
          <label class="sr-only" for="totp-input">Verification code</label>
          <input id="totp-input" #totpInput class="sr-only" inputmode="numeric" autocomplete="one-time-code"
                 maxlength="6" pattern="[0-9]{6}" [(ngModel)]="code"
                 (input)="onCode($event)" />
          <div class="cell" *ngFor="let i of cells; let idx = index"
               [class.is-focus]="idx === focusIndex"
               (click)="totpInput.focus()">{{ digit(idx) }}</div>
        </div>

        <div class="timer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/>
          </svg>
          <span>Code expires in <span class="mono">{{ countdown }}</span></span>
        </div>

        <div class="server-err" role="alert" *ngIf="errorMessage">{{ errorMessage }}</div>

        <adm-btn variant="slatePrimary" size="lg" [full]="true" type="button"
                 [disabled]="code.length !== 6"
                 (press)="onVerify()">Verify code →</adm-btn>

        <div class="recover">
          Lost your authenticator?
          <a href="#" (click)="onLink($event, 'recovery')">Use a recovery code</a>
          or <a href="#" (click)="onLink($event, 'magic')">email a magic link</a>.
        </div>
      </main>

      <adm-home-indicator tone="slate"></adm-home-indicator>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--adm-slate); }
    .adm-2fa { min-height: 100dvh; }

    .hero { padding: 20px 24px 24px; color: #fff; }
    .hero .eyebrow { margin: 28px 0 8px; }
    .hero .title { margin: 0; font-size: 32px; color: #fff; }
    .hero .sub { margin-top: 8px; font-size: 13px; color: var(--adm-slate-muted); max-width: 320px; line-height: 1.5; }

    .body { flex: 1; padding: 4px 24px 0; position: relative; }

    .digits { display: flex; gap: 8px; margin-bottom: 18px; }
    .cell { width: 46px; height: 56px; background: var(--adm-slate-2); border: 1px solid var(--adm-slate-line); border-radius: 12px; display: grid; place-items: center; font-family: var(--adm-font-mono); font-size: 24px; font-weight: 600; color: #fff; line-height: 1; cursor: text; }
    .cell.is-focus { background: #fff; border: 2px solid var(--adm-red); color: #0F1115; }

    .timer { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--adm-slate-2); border: 1px solid var(--adm-slate-line); border-radius: 10px; margin-bottom: 14px; color: var(--adm-slate-muted); font-size: 12px; }
    .timer .mono { font-family: var(--adm-font-mono); color: #fff; font-weight: 600; }

    .server-err { background: rgba(178,58,45,0.12); border: 1px solid rgba(178,58,45,0.30); color: #FCC2B7; border-radius: 10px; padding: 10px 12px; font-size: 12px; margin-bottom: 14px; }

    .recover { margin-top: 18px; font-size: 12px; color: var(--adm-slate-muted); line-height: 1.6; }
    .recover a { color: #fff; text-decoration: underline; text-underline-offset: 3px; }
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
