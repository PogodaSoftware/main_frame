/**
 * AdminPortalMagicLinkComponent — `/admin/portal/magic`
 *
 * Slate magic-link backup. Renders the success state (Link sent) inline so
 * the visual matches the artboard. Real send-link POST + token consume
 * endpoint land with the BeautyAdminMagicLink model.
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
  selector: 'app-admin-portal-magic',
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
    <div class="adm-app adm-magic">
      <adm-status-bar tone="slate"></adm-status-bar>

      <section class="hero">
        <adm-brand-row></adm-brand-row>
        <div class="eyebrow adm-eyebrow">Backup access</div>
        <h1 class="title adm-display">Email me a sign-in link</h1>
        <p class="sub">We'll send a one-time link to your work email. Link expires in 5 minutes and can only be used once.</p>
      </section>

      <main class="body" role="main">
        <label class="label adm-eyebrow" for="adm-magic-email">Work email</label>
        <div class="input">
          <input id="adm-magic-email" name="email" type="email" autocomplete="email" inputmode="email"
                 placeholder="you@beauty.io" [(ngModel)]="email" />
        </div>

        <adm-btn variant="slatePrimary" size="lg" [full]="true" (press)="onSend()">Send magic link →</adm-btn>

        <div class="success-card" *ngIf="sent" role="status" aria-live="polite">
          <div class="row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#86C49B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
            </svg>
            <span class="label-row">Link sent</span>
          </div>
          <div class="body-text">
            Check <span class="mono">{{ email }}</span>. Resend available in <span class="mono">{{ resendIn }}</span>.
          </div>
        </div>

        <div class="back">
          <a href="#" (click)="onBack($event)">← Back to password sign-in</a>
        </div>
      </main>

      <adm-home-indicator tone="slate"></adm-home-indicator>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--adm-slate); }
    .adm-magic { min-height: 100dvh; }

    .hero { padding: 20px 24px 24px; color: #fff; }
    .hero .eyebrow { margin: 28px 0 8px; }
    .hero .title { margin: 0; font-size: 32px; color: #fff; }
    .hero .sub { margin-top: 8px; font-size: 13px; color: var(--adm-slate-muted); max-width: 320px; line-height: 1.5; }

    .body { flex: 1; padding: 4px 24px 0; }
    .label { display: block; margin-bottom: 6px; font-size: 10px; letter-spacing: 1.4px; }
    .input { display: flex; align-items: center; background: var(--adm-slate-2); border: 1px solid var(--adm-slate-line); border-radius: 12px; height: 48px; padding: 0 14px; margin-bottom: 14px; }
    .input input { flex: 1; border: none; outline: none; background: transparent; color: #fff; font-size: 14px; font-family: var(--adm-font-body); }
    .input input::placeholder { color: var(--adm-slate-muted); }

    .success-card { margin-top: 24px; padding: 14px; background: var(--adm-slate-2); border: 1px solid var(--adm-slate-line); border-radius: 12px; }
    .success-card .row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #fff; font-size: 12px; font-weight: 600; }
    .success-card .body-text { font-size: 11px; color: var(--adm-slate-muted); line-height: 1.5; }
    .mono { font-family: var(--adm-font-mono); color: #fff; }

    .back { margin-top: 18px; font-size: 12px; color: var(--adm-slate-muted); }
    .back a { color: #fff; text-decoration: underline; text-underline-offset: 3px; }
  `],
})
export class AdminPortalMagicLinkComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() send = new EventEmitter<string>();
  @Output() followLink = new EventEmitter<BffLink>();

  email = 'maria@beauty.io';
  sent = true; // show success-state by default per artboard
  resendIn = '00:48';

  onSend(): void {
    this.send.emit(this.email.trim());
    this.sent = true;
  }

  onBack(ev: Event): void {
    ev.preventDefault();
    const link = this.links['back'];
    if (link) this.followLink.emit(link);
  }
}
