/**
 * AdminPortalIpWarningComponent — `/admin/portal/ip-warning`
 *
 * Slate IP allowlist mismatch screen. Centered amber-tinted alert + IP code
 * block + VPN CTA + exception link. Resolver later populates `your_ip` +
 * `allowlist_cidrs` from `BeautyAdminIpAllowlist`.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from '../beauty-bff.types';
import {
  AdmStatusBarComponent,
  AdmHomeIndicatorComponent,
  AdmBrandRowComponent,
  AdmBtnComponent,
} from './atoms';

@Component({
  selector: 'app-admin-portal-ip-warning',
  standalone: true,
  imports: [
    CommonModule,
    AdmStatusBarComponent,
    AdmHomeIndicatorComponent,
    AdmBrandRowComponent,
    AdmBtnComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-app adm-ip">
      <adm-status-bar tone="slate"></adm-status-bar>

      <section class="header">
        <adm-brand-row></adm-brand-row>
      </section>

      <main class="body" role="main">
        <div class="warn-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD27A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 9v4M12 17h.01M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
        </div>

        <h1 class="title adm-display">This network isn't allowlisted</h1>
        <p class="sub">
          Admin sign-in is restricted to corporate networks. Connect through the
          company VPN, or request a temporary exception from your security lead.
        </p>

        <div class="ip-block">
          <div class="lbl">Your IP</div>
          <div class="val">{{ yourIp }}</div>
          <div class="lbl">Allowlist</div>
          <div class="val">{{ allowlist }}</div>
        </div>

        <adm-btn variant="slatePrimary" size="lg" [full]="true" (press)="onVpn()">Connect to VPN</adm-btn>

        <div class="exception">
          <a href="#" (click)="onException($event)">Request exception →</a>
        </div>
      </main>

      <adm-home-indicator tone="slate"></adm-home-indicator>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--adm-slate); }
    .adm-ip { min-height: 100dvh; }

    .header { padding: 20px 24px 0; }

    .body { flex: 1; padding: 0 24px; display: flex; flex-direction: column; justify-content: center; color: #fff; }

    .warn-icon { width: 64px; height: 64px; border-radius: 16px; background: rgba(255,196,0,0.12); border: 1px solid rgba(255,196,0,0.30); display: grid; place-items: center; margin-bottom: 20px; }

    .title { margin: 0 0 10px; font-size: 28px; color: #fff; }
    .sub { margin: 0 0 18px; font-size: 13px; color: var(--adm-slate-muted); line-height: 1.55; }

    .ip-block { background: var(--adm-slate-2); border: 1px solid var(--adm-slate-line); border-radius: 12px; padding: 14px; margin-bottom: 14px; font-family: var(--adm-font-mono); font-size: 11px; }
    .ip-block .lbl { color: var(--adm-slate-muted); margin-bottom: 4px; }
    .ip-block .val { color: #fff; font-size: 13px; margin-bottom: 10px; }
    .ip-block .val:last-child { margin-bottom: 0; }

    .exception { margin-top: 12px; text-align: center; font-size: 12px; }
    .exception a { color: #fff; text-decoration: underline; text-underline-offset: 3px; opacity: 0.85; }
  `],
})
export class AdminPortalIpWarningComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get yourIp(): string {
    return (this.data['your_ip'] as string) ?? '73.181.44.218';
  }
  get allowlist(): string {
    return (this.data['allowlist'] as string) ?? '198.51.100.0/24, 203.0.113.0/24';
  }

  onVpn(): void {
    const link = this.links['vpn'];
    if (link) this.followLink.emit(link);
  }

  onException(ev: Event): void {
    ev.preventDefault();
    const link = this.links['exception'];
    if (link) this.followLink.emit(link);
  }
}
