/**
 * AdminPortalFlagsComponent — `/admin/portal/flags` (or `/admin/flags`)
 *
 * Desktop redesign for the runtime feature-flag management screen. Uses the
 * shared slate admin chrome (sidebar + topbar + session-bar + page-header),
 * matching admin-portal-audit.component.ts and admin-portal-team.component.ts
 * patterns exactly.
 *
 * Data contract (from beauty_admin_flags resolver):
 *   data.flags[]:  { key, label, description, enabled, toggle: BffLink }
 *   data.audit[]:  { flag_key, old_value, new_value, changed_by_email,
 *                    changed_by_user_type, changed_at }
 *   data.admin_email: string
 *
 * Toggling: POSTs the flag row's toggle _link with { key, enabled: !current }
 * via BeautyAuthService.follow(), then refetches via bff.resolve('beauty_admin_flags')
 * with stale-while-revalidate opacity fade. No router navigation.
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from '../beauty-bff.types';
import { BeautyAuthService } from '../beauty-auth.service';
import { BeautyBffService } from '../beauty-bff.service';
import { BeautyAdminWebSidebarComponent } from '../admin-web/admin-web-sidebar.component';
import { BeautyAdminWebTopbarComponent } from '../admin-web/admin-web-topbar.component';
import { BeautyAdminWebSessionBarComponent } from '../admin-web/admin-web-session-bar.component';
import { BeautyAdminWebPageHeaderComponent } from '../admin-web/admin-web-page-header.component';

interface FlagRow {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  toggle: BffLink;
}

interface AuditRow {
  flag_key: string;
  old_value: boolean;
  new_value: boolean;
  changed_by_email: string;
  changed_by_user_type: string;
  changed_at: string;
}

@Component({
  selector: 'app-admin-portal-flags',
  standalone: true,
  imports: [
    CommonModule,
    BeautyAdminWebSidebarComponent,
    BeautyAdminWebTopbarComponent,
    BeautyAdminWebSessionBarComponent,
    BeautyAdminWebPageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-web aw-shell">
      <app-admin-web-sidebar active="flags"
        [adminName]="adminName" [adminEmail]="adminEmail" [badges]="navBadges"
        (follow)="followLink.emit($event)"></app-admin-web-sidebar>

      <div class="aw-col">
        <app-admin-web-topbar [notifCount]="notifCount" [adminName]="adminName" [adminEmail]="adminEmail"
          (follow)="followLink.emit($event)"></app-admin-web-topbar>
        <app-admin-web-session-bar [sessionRemaining]="sessionRemaining"
          (follow)="followLink.emit($event)"></app-admin-web-session-bar>

        <main class="aw-main" role="main">
          <app-admin-web-page-header
            [breadcrumb]="['Feature flags']"
            title="Feature flags"
            [sub]="summaryLine"></app-admin-web-page-header>

          <div class="aw-body" [class.is-stale]="loading">

            <!-- Flag list -->
            <div class="aw-card aw-flags-card">
              <div class="aw-cardtop">
                <span class="aw-cardtop-label">Runtime flags</span>
                <span class="aw-loading" *ngIf="loading">
                  <span class="aw-spin" aria-hidden="true"></span> updating…
                </span>
              </div>

              <div *ngIf="!flags.length" class="aw-empty">No feature flags configured.</div>

              <div class="aw-flag-row" *ngFor="let f of flags; let last = last"
                   [class.is-last]="last"
                   [attr.aria-label]="f.label + ' feature flag, ' + (f.enabled ? 'enabled' : 'disabled')">
                <div class="aw-flag-info">
                  <div class="aw-flag-label">{{ f.label }}</div>
                  <div class="aw-flag-key mono">{{ f.key }}</div>
                  <div class="aw-flag-desc" *ngIf="f.description">{{ f.description }}</div>
                </div>
                <div class="aw-flag-ctrl">
                  <span class="aw-status-pill" [class.is-on]="f.enabled">
                    {{ f.enabled ? 'On' : 'Off' }}
                  </span>
                  <button type="button"
                          class="aw-toggle"
                          [class.is-on]="f.enabled"
                          [disabled]="loading || busyKey === f.key"
                          (click)="onToggle(f)"
                          [attr.aria-label]="(f.enabled ? 'Disable' : 'Enable') + ' ' + f.label"
                          [attr.aria-pressed]="f.enabled">
                    <span class="aw-toggle-knob"></span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Audit trail -->
            <div class="aw-card aw-tablecard" style="margin-top:20px;">
              <div class="aw-tabletop">
                <span class="mono">Flag change history</span>
              </div>
              <table class="aw-table" aria-label="Flag change audit">
                <thead>
                  <tr>
                    <th class="c-flag">Flag</th>
                    <th class="c-change">Change</th>
                    <th class="c-who">Changed by</th>
                    <th class="c-when">When</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let a of audit" class="aw-trow"
                      [attr.aria-label]="a.flag_key + ' changed by ' + a.changed_by_email">
                    <td class="c-flag mono">{{ a.flag_key }}</td>
                    <td class="c-change">
                      <span class="aw-change-from" [class.is-off]="!a.old_value">{{ a.old_value ? 'On' : 'Off' }}</span>
                      <span class="aw-arrow" aria-hidden="true">→</span>
                      <span class="aw-change-to" [class.is-on]="a.new_value">{{ a.new_value ? 'On' : 'Off' }}</span>
                    </td>
                    <td class="c-who">
                      <div class="aw-who-compact">
                        <span class="aw-avatar-sm">{{ initials(a.changed_by_email) }}</span>
                        <div>
                          <div class="mono aw-who-email">{{ a.changed_by_email }}</div>
                          <div class="aw-who-role" *ngIf="a.changed_by_user_type">{{ a.changed_by_user_type }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="c-when mono muted">{{ formatDate(a.changed_at) }}</td>
                  </tr>
                  <tr *ngIf="!audit.length">
                    <td colspan="4" class="aw-empty">No flag changes recorded yet.</td>
                  </tr>
                </tbody>
              </table>
              <div class="aw-tablefoot mono" *ngIf="audit.length">
                Showing {{ audit.length }} most recent changes · immutable
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --surface: #F2F2F2; --surface-2: #E9E9EB; --danger: #C0392B; --admin-red: #B23A2D;
      --ok: #2F7A47; --warn: #8A6A1F;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh;
    }
    * { box-sizing: border-box; }
    .mono { font-family: var(--font-mono); }
    .muted { color: var(--text-muted); }

    .aw-shell { display: flex; width: 100%; height: 100dvh; background: var(--surface); font-family: var(--font-body); color: var(--text); overflow: hidden; }
    .aw-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .aw-main { flex: 1; overflow: auto; background: var(--surface); }
    .aw-body { padding: 0 28px 32px; transition: opacity 120ms ease; }
    .aw-body.is-stale { opacity: 0.6; }

    /* Cards */
    .aw-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; margin-top: 20px; }
    .aw-cardtop { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--line); font-size: 0.6875rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); }
    .aw-loading { display: inline-flex; align-items: center; gap: 6px; text-transform: none; letter-spacing: 0; font-weight: 400; }
    .aw-spin { width: 11px; height: 11px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--text); display: inline-block; animation: aw-spin 0.7s linear infinite; }
    @keyframes aw-spin { to { transform: rotate(360deg); } }

    /* Flag rows */
    .aw-flag-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-top: 1px solid var(--surface); gap: 16px; }
    .aw-flag-row:hover { background: #FAFAFA; }
    .aw-flag-info { flex: 1; min-width: 0; }
    .aw-flag-label { font-size: 0.9375rem; font-weight: 600; color: var(--text); }
    .aw-flag-key { font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px; font-family: var(--font-mono); }
    .aw-flag-desc { font-size: 0.8125rem; color: var(--text-muted); margin-top: 4px; }
    .aw-flag-ctrl { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

    .aw-status-pill { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.4px; background: var(--surface-2); color: var(--text-muted); }
    .aw-status-pill.is-on { background: #E8F5EE; color: var(--ok); }

    /* Toggle switch */
    .aw-toggle { position: relative; width: 44px; height: 24px; border-radius: 999px; border: none; cursor: pointer; background: var(--surface-2); transition: background 140ms ease; padding: 0; flex-shrink: 0; }
    .aw-toggle.is-on { background: var(--ok); }
    .aw-toggle:disabled { opacity: 0.45; cursor: not-allowed; }
    .aw-toggle-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 140ms ease; box-shadow: 0 1px 3px rgba(0,0,0,0.2); display: block; }
    .aw-toggle.is-on .aw-toggle-knob { transform: translateX(20px); }

    /* Audit table */
    .aw-tablecard { transition: opacity 120ms ease; }
    .aw-tabletop { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--line); font-size: 0.6875rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); }

    .aw-table { width: 100%; border-collapse: collapse; }
    .aw-table thead tr { background: var(--surface); border-bottom: 1px solid var(--line); }
    .aw-table th { padding: 10px 12px; font-size: 0.625rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); text-align: left; }
    .aw-table td { padding: 11px 12px; font-size: 0.8125rem; vertical-align: middle; border-top: 1px solid var(--surface); }
    .aw-trow:hover { background: #FAFAFA; }

    .c-flag { width: 220px; }
    .c-change { width: 120px; }
    .c-who { min-width: 200px; }
    .c-when { width: 130px; }

    .aw-change-from { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); padding: 2px 7px; border-radius: 4px; background: var(--surface-2); }
    .aw-change-to { font-size: 0.75rem; font-weight: 600; color: var(--ok); padding: 2px 7px; border-radius: 4px; background: #E8F5EE; }
    .aw-change-to:not(.is-on) { color: var(--text-muted); background: var(--surface-2); }
    .aw-arrow { font-size: 0.75rem; color: var(--text-muted); margin: 0 4px; }

    .aw-who-compact { display: flex; align-items: center; gap: 8px; }
    .aw-avatar-sm { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #C8A57E, #6B4F3A); color: #fff; display: grid; place-items: center; font-size: 0.5rem; font-weight: 700; flex-shrink: 0; }
    .aw-who-email { font-size: 0.6875rem; font-family: var(--font-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .aw-who-role { font-size: 0.5625rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600; margin-top: 1px; }

    .aw-empty { padding: 28px 16px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }
    .aw-tablefoot { padding: 12px 16px; border-top: 1px solid var(--line); background: #F8F8F8; font-size: 0.6875rem; color: var(--text-muted); }

    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }
  `],
})
export class AdminPortalFlagsComponent {
  private _data: Record<string, unknown> = {};
  @Input() set data(v: Record<string, unknown>) {
    this._data = v || {};
    this.local = null;
  }
  get data(): Record<string, unknown> { return this._data; }
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  private local: Record<string, unknown> | null = null;
  private get d(): Record<string, unknown> { return this.local ?? this._data; }

  loading = false;
  busyKey: string | null = null;

  constructor(
    private auth: BeautyAuthService,
    private bff: BeautyBffService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ---- chrome getters ----
  get notifCount(): number | null { return (this.d['notif_count'] as number | null) ?? null; }
  get adminName(): string { return (this.d['admin_email'] as string) || 'Admin'; }
  get adminEmail(): string { return (this.d['admin_email'] as string) || ''; }
  get sessionRemaining(): string { return (this.d['session_remaining'] as string) ?? '14:32'; }
  get navBadges(): Record<string, number> {
    const badges = (this.d['tab_badges'] as Record<string, number | null>) ?? {};
    const out: Record<string, number> = {};
    if (badges['tickets']) out['tickets'] = badges['tickets'] as number;
    return out;
  }

  // ---- data getters ----
  get flags(): FlagRow[] { return (this.d['flags'] as FlagRow[]) ?? []; }
  get audit(): AuditRow[] { return (this.d['audit'] as AuditRow[]) ?? []; }
  get summaryLine(): string {
    const n = this.flags.length;
    return `${n} runtime flag${n === 1 ? '' : 's'} · changes take effect on next request`;
  }

  initials(email: string): string {
    if (!email) return 'AA';
    const parts = email.split('@')[0].split(/[._\-]/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : email.substring(0, 2).toUpperCase();
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  onToggle(flag: FlagRow): void {
    if (this.loading || this.busyKey) return;
    this.busyKey = flag.key;
    this.loading = true;
    this.cdr.markForCheck();

    this.auth.follow(flag.toggle, { key: flag.key, enabled: !flag.enabled }).subscribe({
      next: () => {
        // Refetch with stale-while-revalidate.
        this.bff.resolve('beauty_admin_flags', {}).subscribe({
          next: (resp) => {
            if (resp.action === 'render') {
              this.local = (resp.data ?? {}) as Record<string, unknown>;
            }
            this.loading = false;
            this.busyKey = null;
            this.cdr.markForCheck();
          },
          error: () => {
            this.loading = false;
            this.busyKey = null;
            this.cdr.markForCheck();
          },
        });
      },
      error: () => {
        this.loading = false;
        this.busyKey = null;
        this.cdr.markForCheck();
      },
    });
  }
}
