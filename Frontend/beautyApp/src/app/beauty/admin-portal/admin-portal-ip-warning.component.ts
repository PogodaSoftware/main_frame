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
import { BeautyAdminWebAuthLayoutComponent } from '../admin-web/admin-web-auth-layout.component';

@Component({
  selector: 'app-admin-portal-ip-warning',
  standalone: true,
  imports: [CommonModule, BeautyAdminWebAuthLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-admin-web-auth-layout
      eyebrow="Access denied"
      title="This network isn't allowlisted."
      sub="Your IP is outside the corporate allowlist for the admin tool. Connect to the office network or the corporate VPN, then try again."
      footerNote="Need temporary access? Ask an admin to add your IP in Team → IP allowlist.">
      <div class="aw-card">
        <div class="alert" role="alert">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C0392B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 2l10 18H2L12 2z"/><path d="M12 9v5M12 17h.01"/>
          </svg>
          <div>
            <div class="ahead">IP allowlist mismatch</div>
            <div class="abody">We saw the request from <span class="mono">{{ yourIp }}</span>. This network is not on the allowlist (<span class="mono">{{ allowlist }}</span>).</div>
          </div>
        </div>

        <div class="net-grid">
          <div class="net">
            <div class="nlbl">CORP VPN</div>
            <div class="nname">corp.beauty.io</div>
            <div class="nsub">Recommended</div>
          </div>
          <div class="net">
            <div class="nlbl">OFFICE WIFI</div>
            <div class="nname">Beauty-Office</div>
            <div class="nsub">203.0.113.0/24</div>
          </div>
        </div>

        <button type="button" class="aw-primary" (click)="onVpn()">Retry on a new network</button>
        <div class="exception"><a href="#" class="aw-link" (click)="onException($event)">Request exception →</a></div>
      </div>
    </app-admin-web-auth-layout>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; }
    * { box-sizing: border-box; }
    .aw-card { background: #fff; border: 1px solid #DCDCDF; border-radius: 14px; padding: 28px; font-family: 'Inter', system-ui, sans-serif; }

    .alert { background: #FCE8E5; color: #C0392B; border: 1px solid rgba(192,57,43,0.20); border-radius: 12px; padding: 20px; margin-bottom: 18px; display: flex; gap: 14px; align-items: flex-start; }
    .alert svg { flex-shrink: 0; margin-top: 2px; }
    .ahead { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.25rem; font-weight: 500; margin-bottom: 4px; }
    .abody { font-size: 0.75rem; line-height: 1.55; }
    .mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-weight: 700; }

    .net-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 18px; }
    .net { background: #fff; border: 1px solid #DCDCDF; border-radius: 10px; padding: 14px; }
    .nlbl { font-size: 0.5625rem; font-weight: 700; letter-spacing: 1.4px; color: #6B6F77; text-transform: uppercase; }
    .nname { font-size: 0.875rem; font-weight: 600; margin-top: 4px; color: #0F1115; }
    .nsub { font-family: ui-monospace, monospace; font-size: 0.625rem; color: #6B6F77; margin-top: 2px; }

    .aw-primary { width: 100%; height: 48px; border-radius: 10px; background: #0F1115; color: #fff; border: 1px solid #0F1115; font-family: 'Inter', system-ui, sans-serif; font-size: 0.875rem; font-weight: 600; cursor: pointer; }
    .aw-primary:hover { background: #000; }
    .exception { margin-top: 14px; text-align: center; font-size: 0.75rem; }
    .aw-link { color: #0F1115; font-weight: 600; text-decoration: none; cursor: pointer; }
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
