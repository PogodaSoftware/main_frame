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
import { BeautyAdminWebAuthLayoutComponent } from '../admin-web/admin-web-auth-layout.component';

@Component({
  selector: 'app-admin-portal-magic',
  standalone: true,
  imports: [CommonModule, FormsModule, BeautyAdminWebAuthLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-web-auth-layout
      eyebrow="Magic-link backup"
      title="Can't reach your authenticator?"
      sub="We'll send a one-time sign-in link to your beauty.io email. The link expires in 10 minutes and can only be used from an allowlisted IP."
      footerNote="Still locked out? Have another admin run admin:reset 2fa --user you@beauty.io">
      <div class="aw-card">
        <h2 class="aw-h2">Send magic link</h2>
        <div class="aw-cardsub">You'll still need 2FA on your next sign-in.</div>

        <label class="aw-label" for="adm-magic-email">Email</label>
        <input id="adm-magic-email" class="aw-input mono" name="email" type="email"
               autocomplete="email" inputmode="email" placeholder="you@beauty.io" [(ngModel)]="email" />

        <div class="aw-warn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A6A1F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 2l10 18H2L12 2z"/><path d="M12 9v5M12 17h.01"/>
          </svg>
          <span>Magic links bypass your password — keep your inbox secure. Every magic-link sign-in is logged in the audit feed.</span>
        </div>

        <button type="button" class="aw-primary" (click)="onSend()">Email me a link</button>

        <div class="success-card" *ngIf="sent" role="status" aria-live="polite">
          <div class="row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2F7A47" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
            </svg>
            <span>Link sent</span>
          </div>
          <div class="body-text">Check <span class="mono">{{ email }}</span>. Resend available in <span class="mono">{{ resendIn }}</span>.</div>
        </div>

        <div class="back"><a href="#" class="aw-link" (click)="onBack($event)">← Back to password sign-in</a></div>
      </div>
    </app-admin-web-auth-layout>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; }
    * { box-sizing: border-box; }
    .aw-card { background: #fff; border: 1px solid #DCDCDF; border-radius: 14px; padding: 28px; font-family: 'Inter', system-ui, sans-serif; }
    .aw-h2 { margin: 0 0 4px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.625rem; font-weight: 500; color: #0F1115; line-height: 1.1; }
    .aw-cardsub { font-size: 0.75rem; color: #6B6F77; margin-bottom: 22px; }
    .aw-label { display: block; font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #6B6F77; margin: 0 0 6px; }
    .aw-input { width: 100%; height: 44px; border: 1px solid #DCDCDF; border-radius: 10px; padding: 0 12px; font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; color: #0F1115; background: #fff; outline: none; margin-bottom: 14px; }
    .aw-input.mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
    .aw-input:focus { border-color: #0F1115; }

    .aw-warn { background: #FFF4DA; border: 1px solid rgba(165,122,31,0.25); border-radius: 10px; padding: 12px; margin-bottom: 18px; display: flex; gap: 10px; align-items: flex-start; font-size: 0.75rem; color: #8A6A1F; line-height: 1.5; }
    .aw-warn svg { flex-shrink: 0; margin-top: 1px; }

    .aw-primary { width: 100%; height: 48px; border-radius: 10px; background: #0F1115; color: #fff; border: 1px solid #0F1115; font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
    .aw-primary:hover { background: #000; }

    .success-card { margin-top: 18px; padding: 14px; background: #E5F3EA; border: 1px solid #BfDfCb; border-radius: 12px; }
    .success-card .row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; color: #2F7A47; font-size: 0.8125rem; font-weight: 600; }
    .success-card .body-text { font-size: 0.75rem; color: #4a6a55; line-height: 1.5; }
    .mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; color: #0F1115; }

    .back { margin-top: 14px; text-align: center; font-size: 0.75rem; }
    .aw-link { color: #0F1115; font-weight: 600; text-decoration: none; cursor: pointer; }
  `],
})
export class AdminPortalMagicLinkComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() send = new EventEmitter<string>();
  @Output() followLink = new EventEmitter<BffLink>();

  email = 'maria@beauty.io';
  sent = false; // form-only by default per design; flips true after send
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
