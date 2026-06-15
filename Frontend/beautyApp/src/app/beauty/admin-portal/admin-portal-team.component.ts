/**
 * AdminPortalTeamComponent — `/admin/portal/team`
 *
 * Desktop redesign (web) per `web-admin-pages2.jsx` WebAdminTeam: shared slate
 * chrome + page header (Audit-log + owner-only "Invite admin" actions) + a
 * 2-col body — left: the admin roster (real <table>) with an inline row drawer
 * (role change + revoke) and a pending-invites section; right: the real
 * role-permissions matrix card.
 *
 * Writes (invite / change role / revoke) POST/PATCH/DELETE the real HATEOAS
 * links and refetch in place (RN parity, no nav flicker). Mirrors RN `team.tsx`.
 *
 * Button audit vs RN + design: dropped the design's fabricated "IP allowlist"
 * card (no backend), the "Role permissions" header button + tabs (the matrix is
 * shown inline; there is no separate editable roles screen), and the fabricated
 * roster fixtures. Revoke is a real two-step inline confirm (no native dialog).
 *
 * @Input/@Output contract + inviteResult()/roleResult() preserved (shell wiring).
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import { BeautyAuthService } from '../beauty-auth.service';
import { BeautyBffService } from '../beauty-bff.service';
import { BeautyAdminWebSidebarComponent } from '../admin-web/admin-web-sidebar.component';
import { BeautyAdminWebTopbarComponent } from '../admin-web/admin-web-topbar.component';
import { BeautyAdminWebSessionBarComponent } from '../admin-web/admin-web-session-bar.component';
import { BeautyAdminWebPageHeaderComponent } from '../admin-web/admin-web-page-header.component';

interface AdminRow {
  principal_id: number;
  user_type: string;
  user_id: number;
  name: string;
  email: string;
  role: string;
  role_label: string;
  role_color: string;
  role_bg: string;
  last_active: string;
  status: string;
  initials: string;
  is_me: boolean;
}
interface InviteRow { id: number; email: string; role: string; role_label: string; expires_at: string; }
interface RoleOption { value: string; label: string; color: string; bg: string; }
interface MatrixCell { label: string; values: string[]; }
interface PermissionMatrix {
  role_order: string[];
  role_labels: string[];
  role_colors: string[];
  rows: MatrixCell[];
}
interface Totals { admins: number; owners: number; pending_invites: number; }

@Component({
  selector: 'app-admin-portal-team',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    BeautyAdminWebSidebarComponent,
    BeautyAdminWebTopbarComponent,
    BeautyAdminWebSessionBarComponent,
    BeautyAdminWebPageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-web aw-shell">
      <app-admin-web-sidebar active="team"
        [adminName]="adminName" [adminEmail]="adminEmail" [badges]="navBadges"
        (follow)="followLink.emit($event)"></app-admin-web-sidebar>

      <div class="aw-col">
        <app-admin-web-topbar [notifCount]="notifCount" [adminName]="adminName" [adminEmail]="adminEmail"
          (follow)="followLink.emit($event)"></app-admin-web-topbar>
        <app-admin-web-session-bar [sessionRemaining]="sessionRemaining"
          (follow)="followLink.emit($event)"></app-admin-web-session-bar>

        <main class="aw-main" role="main" [class.is-stale]="loading">
          <app-admin-web-page-header
            [breadcrumb]="['Team & access']"
            title="Team"
            [sub]="summaryLine">
            <div slot="actions" class="aw-hactions">
              <button type="button" class="aw-btn aw-btn--sec" (click)="onAudit()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>
                Audit log
              </button>
              <button type="button" class="aw-btn aw-btn--pri" *ngIf="isOwner" (click)="toggleInvite()" [attr.aria-expanded]="inviteOpen">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Invite admin
              </button>
            </div>
          </app-admin-web-page-header>

          <!-- Invite composer (owner-only) -->
          <div class="aw-composer-panel" *ngIf="isOwner && inviteOpen">
            <div class="aw-eyebrow">Invite teammate</div>
            <div class="aw-invite-grid">
              <div>
                <label class="aw-field-l" for="invite-email">Work email</label>
                <input id="invite-email" class="aw-ti" type="email" [(ngModel)]="inviteEmail" placeholder="name@beauty.io" />
              </div>
              <div>
                <span class="aw-field-l">Role</span>
                <div class="aw-rolechips">
                  <button type="button" *ngFor="let r of roleOptions" class="aw-rolechip"
                          [class.is-active]="inviteRole === r.value"
                          [style.color]="r.color"
                          [style.background]="inviteRole === r.value ? r.bg : '#fff'"
                          [style.borderColor]="inviteRole === r.value ? r.color + '55' : '#DCDCDF'"
                          (click)="inviteRole = r.value">{{ r.label }}</button>
                </div>
              </div>
            </div>
            <div class="aw-invite-info">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              Invite is sent via email and expires in 72h. 2FA is required on first sign-in.
            </div>
            <div class="aw-composer-actions">
              <span class="aw-hint err" *ngIf="inviteError" role="alert">{{ inviteError }}</span>
              <span class="aw-hint ok" *ngIf="inviteSent" role="status">Invite sent.</span>
              <span class="grow"></span>
              <button type="button" class="aw-btn aw-btn--sec" (click)="inviteOpen = false">Cancel</button>
              <button type="button" class="aw-btn aw-btn--pri" (click)="onInviteSend()" [disabled]="!canSendInvite">Send invite →</button>
            </div>
          </div>

          <div class="aw-body">
            <!-- Left: roster -->
            <div class="aw-leftcol">
              <div class="aw-card aw-tablecard">
                <div class="aw-tabletop">
                  <span class="mono">{{ totals.admins }} admin{{ totals.admins === 1 ? '' : 's' }}</span>
                  <span class="aw-loading" *ngIf="loading"><span class="aw-spin" aria-hidden="true"></span> updating…</span>
                </div>
                <table class="aw-table">
                  <thead>
                    <tr>
                      <th>Admin</th>
                      <th class="c-role">Role</th>
                      <th class="c-last">Last active</th>
                      <th class="c-act" *ngIf="isOwner"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <ng-container *ngFor="let a of admins">
                      <tr class="aw-trow" [class.is-open]="openMenuId === a.principal_id">
                        <td>
                          <div class="aw-id">
                            <span class="aw-avatar">{{ a.initials }}</span>
                            <div class="aw-id-text">
                              <div class="aw-id-name">{{ a.name }}<span class="aw-me" *ngIf="a.is_me">you</span></div>
                              <div class="aw-id-email mono">{{ a.email || '—' }}</div>
                            </div>
                          </div>
                        </td>
                        <td class="c-role"><span class="aw-rolepill" [style.background]="a.role_bg" [style.color]="a.role_color">{{ a.role_label }}</span></td>
                        <td class="c-last mono muted">{{ a.last_active }}</td>
                        <td class="c-act" *ngIf="isOwner">
                          <button type="button" class="aw-kebab" *ngIf="!a.is_me"
                                  [class.is-active]="openMenuId === a.principal_id"
                                  (click)="toggleMenu(a)" aria-label="Manage admin">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
                          </button>
                        </td>
                      </tr>
                      <tr *ngIf="openMenuId === a.principal_id" class="aw-drawer-row">
                        <td [attr.colspan]="isOwner ? 4 : 3">
                          <div class="aw-drawer">
                            <div class="aw-drawer-col">
                              <span class="aw-dl">Role</span>
                              <div class="aw-rolechips">
                                <button type="button" *ngFor="let r of roleOptions" class="aw-rolechip"
                                        [class.is-active]="menuRole === r.value"
                                        [style.color]="r.color"
                                        [style.background]="menuRole === r.value ? r.bg : '#fff'"
                                        [style.borderColor]="menuRole === r.value ? r.color + '55' : '#DCDCDF'"
                                        (click)="menuRole = r.value">{{ r.label }}</button>
                                <button type="button" class="aw-btn aw-btn--pri sm" (click)="onRoleSave(a)" [disabled]="menuRole === a.role">Save role</button>
                              </div>
                            </div>
                            <div class="aw-drawer-col">
                              <span class="aw-dl">Danger zone</span>
                              <div class="aw-revoke-line">
                                <button type="button" class="aw-btn aw-btn--danger sm" *ngIf="revokeArmId !== a.principal_id" (click)="revokeArmId = a.principal_id">Revoke admin</button>
                                <ng-container *ngIf="revokeArmId === a.principal_id">
                                  <span class="aw-confirm-q">Revoke {{ a.email }}?</span>
                                  <button type="button" class="aw-btn aw-btn--danger sm" (click)="onRevoke(a)">Confirm revoke</button>
                                  <button type="button" class="aw-btn aw-btn--sec sm" (click)="revokeArmId = null">Cancel</button>
                                </ng-container>
                              </div>
                              <span class="aw-hint err" *ngIf="menuError" role="alert">{{ menuError }}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </ng-container>
                    <tr *ngIf="!admins.length"><td [attr.colspan]="isOwner ? 4 : 3" class="aw-empty">No admins.</td></tr>
                  </tbody>
                </table>

                <!-- Pending invites -->
                <div class="aw-invites" *ngIf="invites.length">
                  <div class="aw-eyebrow aw-invites-head">Pending invites</div>
                  <div *ngFor="let inv of invites" class="aw-invite-row">
                    <span class="aw-inv-icon">&#64;</span>
                    <div class="aw-id-text">
                      <div class="aw-id-name">{{ inv.email }}</div>
                      <div class="aw-id-email mono">expires {{ inv.expires_at | slice:0:10 }}</div>
                    </div>
                    <span class="aw-rolepill" [style.background]="roleBg(inv.role)" [style.color]="roleColor(inv.role)">{{ inv.role_label }}</span>
                  </div>
                </div>
              </div>

              <div class="aw-card aw-notowner" *ngIf="!isOwner">
                <div class="aw-notowner-title">Owner role required</div>
                <div class="aw-notowner-body">You can view the admin roster and permissions matrix, but only Owners can invite, change roles, or revoke admin access.</div>
              </div>
            </div>

            <!-- Right: role permissions matrix -->
            <div class="aw-rightcol">
              <div class="aw-card aw-matrix-card">
                <div class="aw-cardhead">
                  <h3 class="aw-h3">Role permissions</h3>
                  <span class="aw-muted">Authorization is per-role</span>
                </div>
                <table class="aw-matrix">
                  <thead>
                    <tr>
                      <th class="m-perm">Permission</th>
                      <th *ngFor="let lab of permissionMatrix.role_labels; let i = index" class="m-role"
                          [style.color]="permissionMatrix.role_colors[i]">{{ lab }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let r of permissionMatrix.rows">
                      <td class="m-perm-label">{{ r.label }}</td>
                      <td *ngFor="let v of r.values" class="m-cell-td">
                        <span class="m-cell" [class.allowed]="v === 'Y'" [class.approval]="v === 'A'" [class.denied]="v === 'n'">
                          <ng-container [ngSwitch]="v">
                            <svg *ngSwitchCase="'Y'" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                            <span *ngSwitchCase="'A'" class="mono m-approval">2nd</span>
                            <svg *ngSwitchDefault width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>
                          </ng-container>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div class="aw-legend">
                  <span class="leg"><span class="leg-sq allowed"></span> Allowed</span>
                  <span class="leg"><span class="leg-sq approval"></span> 2nd-admin approval</span>
                  <span class="leg"><span class="leg-sq denied"></span> Denied</span>
                </div>
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
      --ok: #2F7A47; --warn: #8A6A1F; --slate: #0E1620;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh;
    }
    * { box-sizing: border-box; }
    .mono { font-family: var(--font-mono); }
    .grow { flex: 1; }
    .muted { color: var(--text-muted); }

    .aw-shell { display: flex; width: 100%; height: 100dvh; background: var(--surface); font-family: var(--font-body); color: var(--text); overflow: hidden; }
    .aw-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .aw-main { flex: 1; overflow: auto; background: var(--surface); transition: opacity 120ms ease; }
    .aw-main.is-stale { opacity: 0.6; }
    .aw-body { padding: 20px 28px 32px; display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; align-items: start; }

    .aw-hactions { display: flex; gap: 8px; align-items: center; }
    .aw-btn { height: 38px; padding: 0 14px; border-radius: 10px; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; line-height: 1; border: 1px solid transparent; }
    .aw-btn.sm { height: 30px; padding: 0 10px; font-size: 0.75rem; border-radius: 8px; }
    .aw-btn--sec { background: #fff; color: var(--text); border-color: var(--line); }
    .aw-btn--pri { background: #0F1115; color: #fff; border-color: #0F1115; }
    .aw-btn--danger { background: var(--admin-red); color: #fff; border-color: var(--admin-red); }
    .aw-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* invite composer */
    .aw-composer-panel { margin: 16px 28px 0; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
    .aw-eyebrow { font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; }
    .aw-invite-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 14px; align-items: start; }
    .aw-field-l { display: block; font-size: 0.5625rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 5px; }
    .aw-ti { width: 100%; height: 38px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 0 11px; font-family: var(--font-body); font-size: 0.8125rem; color: var(--text); outline: none; }
    .aw-ti:focus { border-color: var(--text); }
    .aw-rolechips { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .aw-rolechip { font-size: 0.625rem; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--line); background: #fff; cursor: pointer; font-family: var(--font-body); }
    .aw-invite-info { display: flex; align-items: center; gap: 8px; padding: 9px 11px; background: var(--surface); border-radius: 10px; margin: 12px 0; font-size: 0.6875rem; color: var(--text-muted); line-height: 1.5; }
    .aw-composer-actions { display: flex; align-items: center; gap: 8px; }
    .aw-hint { font-size: 0.6875rem; color: var(--text-muted); }
    .aw-hint.err { color: var(--danger); } .aw-hint.ok { color: var(--ok); }

    /* cards / table */
    .aw-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }
    .aw-leftcol, .aw-rightcol { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
    .aw-tablecard { overflow: hidden; }
    .aw-tabletop { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--line); font-size: 0.6875rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); }
    .aw-loading { display: inline-flex; align-items: center; gap: 6px; text-transform: none; letter-spacing: 0; font-weight: 400; }
    .aw-spin { width: 11px; height: 11px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--text); display: inline-block; animation: aw-spin 0.7s linear infinite; }
    @keyframes aw-spin { to { transform: rotate(360deg); } }

    .aw-table { width: 100%; border-collapse: collapse; }
    .aw-table thead tr { background: var(--surface); border-bottom: 1px solid var(--line); }
    .aw-table th { padding: 10px 14px; font-size: 0.625rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); text-align: left; }
    .aw-table td { padding: 12px 14px; font-size: 0.8125rem; vertical-align: middle; border-top: 1px solid var(--surface); }
    .aw-trow.is-open td { border-bottom: none; background: #FAFAFA; }
    .c-role { width: 140px; } .c-last { width: 110px; } .c-act { width: 48px; text-align: right; }
    .aw-id { display: flex; align-items: center; gap: 12px; }
    .aw-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #C8A57E, #6B4F3A); color: #fff; display: grid; place-items: center; font-size: 0.6875rem; font-weight: 700; flex-shrink: 0; }
    .aw-id-text { min-width: 0; }
    .aw-id-name { font-size: 0.8125rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
    .aw-me { background: var(--slate); color: #fff; font-size: 0.5rem; font-weight: 700; padding: 1px 6px; border-radius: 999px; letter-spacing: 0.4px; text-transform: uppercase; }
    .aw-id-email { font-size: 0.625rem; color: var(--text-muted); margin-top: 2px; }
    .aw-rolepill { display: inline-block; font-size: 0.5625rem; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; }
    .aw-kebab { width: 30px; height: 30px; border: none; background: transparent; cursor: pointer; display: grid; place-items: center; color: var(--text-muted); border-radius: 8px; }
    .aw-kebab.is-active, .aw-kebab:hover { background: var(--surface); color: var(--text); }

    .aw-drawer-row td { padding: 0 14px 14px; border-top: none; background: #FAFAFA; }
    .aw-drawer { display: flex; flex-wrap: wrap; gap: 22px; align-items: flex-start; padding: 12px 14px; background: #fff; border: 1px solid var(--line); border-radius: 10px; }
    .aw-drawer-col { display: flex; flex-direction: column; gap: 8px; }
    .aw-dl { font-size: 0.5625rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); }
    .aw-revoke-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .aw-confirm-q { font-size: 0.75rem; color: var(--text); font-weight: 600; }

    .aw-invites { border-top: 1px solid var(--line); }
    .aw-invites-head { padding: 12px 16px 2px; }
    .aw-invite-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-top: 1px solid var(--surface); }
    .aw-inv-icon { width: 36px; height: 36px; border-radius: 50%; background: var(--surface-2); color: var(--text-muted); display: grid; place-items: center; font-weight: 700; flex-shrink: 0; }
    .aw-invite-row .aw-rolepill { margin-left: auto; }

    .aw-notowner { padding: 16px; }
    .aw-notowner-title { font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px; }
    .aw-notowner-body { font-size: 0.75rem; color: var(--text-muted); line-height: 1.5; }

    /* matrix */
    .aw-matrix-card { overflow: hidden; }
    .aw-cardhead { display: flex; align-items: baseline; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--line); }
    .aw-h3 { margin: 0; font-family: var(--font-display); font-size: 1.25rem; font-weight: 500; color: var(--text); line-height: 1.1; }
    .aw-matrix { width: 100%; border-collapse: collapse; }
    .aw-matrix th { padding: 9px 8px; font-size: 0.5625rem; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-muted); }
    .aw-matrix th.m-perm { text-align: left; padding-left: 16px; }
    .aw-matrix th.m-role { text-align: center; width: 44px; }
    .aw-matrix td { border-top: 1px solid #ECECEE; padding: 7px 8px; }
    .aw-matrix .m-perm-label { font-size: 0.75rem; color: var(--text); padding-left: 16px; }
    .m-cell-td { text-align: center; }
    .m-cell { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; }
    .m-cell.allowed { background: #E5F3EA; color: var(--ok); }
    .m-cell.approval { background: #F1E8DA; color: var(--warn); }
    .m-cell.denied { background: var(--surface); color: #B8BBC0; }
    .m-approval { font-size: 0.5625rem; font-weight: 700; }
    .aw-legend { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-top: 1px solid #ECECEE; background: #FAFAFA; font-size: 0.625rem; color: var(--text-muted); flex-wrap: wrap; }
    .leg { display: inline-flex; align-items: center; gap: 4px; }
    .leg-sq { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
    .leg-sq.allowed { background: #E5F3EA; border: 1px solid var(--ok); }
    .leg-sq.approval { background: #F1E8DA; border: 1px solid var(--warn); }
    .leg-sq.denied { background: var(--surface); border: 1px solid var(--line); }

    .aw-empty { padding: 28px 16px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }

    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }
    @media screen and (max-width: 1100px) {
      .aw-body { grid-template-columns: 1fr; }
      .aw-invite-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class AdminPortalTeamComponent {
  private _data: Record<string, unknown> = {};
  @Input() set data(v: Record<string, unknown>) { this._data = v || {}; this.local = null; }
  get data(): Record<string, unknown> { return this._data; }
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
  // Preserved for the shell wiring contract (writes are now done in place).
  @Output() inviteAdmin = new EventEmitter<{ email: string; role: string }>();
  @Output() changeRole = new EventEmitter<{ principal_id: number; role: string }>();
  @Output() revokeAdmin = new EventEmitter<{ principal_id: number; email: string }>();

  private local: Record<string, unknown> | null = null;
  private get d(): Record<string, unknown> { return this.local ?? this._data; }

  loading = false;

  openMenuId: number | null = null;
  menuRole = 'support_agent';
  menuError: string | null = null;
  revokeArmId: number | null = null;

  inviteEmail = '';
  inviteRole = 'support_agent';
  inviteError: string | null = null;
  inviteSent = false;
  inviteOpen = false;

  constructor(private auth: BeautyAuthService, private bff: BeautyBffService, private cdr: ChangeDetectorRef) {}

  // ---- chrome getters ----
  get notifCount(): number | null { return (this.d['notif_count'] as number | null) ?? null; }
  get adminName(): string { return (this.d['first_name'] as string) || 'Maria R.'; }
  get adminEmail(): string { return (this.d['admin_email'] as string) || 'maria@beauty.io'; }
  get sessionRemaining(): string { return (this.d['session_remaining'] as string) ?? '14:32'; }
  get navBadges(): Record<string, number> {
    const badges = (this.d['tab_badges'] as Record<string, number | null>) ?? {};
    const out: Record<string, number> = {};
    if (badges['tickets']) out['tickets'] = badges['tickets'] as number;
    return out;
  }

  // ---- data getters ----
  get admins(): AdminRow[] { return (this.d['admins'] as AdminRow[]) ?? []; }
  get invites(): InviteRow[] { return (this.d['invites'] as InviteRow[]) ?? []; }
  get totals(): Totals { return (this.d['totals'] as Totals) ?? { admins: 0, owners: 0, pending_invites: 0 }; }
  get roleOptions(): RoleOption[] { return (this.d['role_options'] as RoleOption[]) ?? []; }
  get permissionMatrix(): PermissionMatrix {
    return (this.d['permission_matrix'] as PermissionMatrix) ?? { role_order: [], role_labels: [], role_colors: [], rows: [] };
  }
  get isOwner(): boolean { return Boolean(this.d['is_owner']); }
  get summaryLine(): string {
    const t = this.totals;
    return `Beauty admins are invite-only · ${t.admins} admin${t.admins === 1 ? '' : 's'} · `
      + `${t.owners} owner${t.owners === 1 ? '' : 's'} · ${t.pending_invites} pending invite${t.pending_invites === 1 ? '' : 's'}`;
  }
  get canSendInvite(): boolean {
    const e = (this.inviteEmail || '').trim();
    return e.length > 3 && e.includes('@') && !!this.inviteRole;
  }

  roleColor(value: string): string { return this.roleOptions.find((r) => r.value === value)?.color ?? '#6B6F77'; }
  roleBg(value: string): string { return this.roleOptions.find((r) => r.value === value)?.bg ?? '#E9E9EB'; }

  // ---- nav ----
  onAudit(): void { const link = this.links['audit']; if (link) this.followLink.emit(link); }

  // ---- in-place refetch ----
  private refetch(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.bff.resolve('beauty_admin_portal_team').subscribe({
      next: (resp) => {
        if (resp && resp.action === 'render' && resp.data) { this.local = resp.data as Record<string, unknown>; }
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  // ---- row menu (role / revoke) ----
  toggleMenu(a: AdminRow): void {
    if (this.openMenuId === a.principal_id) { this.openMenuId = null; this.menuError = null; this.revokeArmId = null; return; }
    this.openMenuId = a.principal_id;
    this.menuRole = a.role;
    this.menuError = null;
    this.revokeArmId = null;
  }

  onRoleSave(a: AdminRow): void {
    if (this.menuRole === a.role) { this.openMenuId = null; return; }
    const tmpl = this.links['role_template'];
    if (!tmpl?.href) { this.menuError = 'Endpoint unavailable.'; return; }
    const call: BffLink = { ...tmpl, href: tmpl.href.replace(':id', String(a.principal_id)) };
    this.menuError = null;
    this.auth.follow(call, { role: this.menuRole }, true).subscribe({
      next: () => { this.openMenuId = null; this.revokeArmId = null; this.refetch(); },
      error: (e) => { this.menuError = (e?.error?.detail) ?? 'Failed to update role.'; this.cdr.markForCheck(); },
    });
  }

  onRevoke(a: AdminRow): void {
    const tmpl = this.links['revoke_template'];
    if (!tmpl?.href) { this.menuError = 'Endpoint unavailable.'; return; }
    const call: BffLink = { ...tmpl, href: tmpl.href.replace(':id', String(a.principal_id)) };
    this.menuError = null;
    this.auth.follow(call, {}, true).subscribe({
      next: () => { this.openMenuId = null; this.revokeArmId = null; this.refetch(); },
      error: (e) => { this.menuError = (e?.error?.detail) ?? 'Failed to revoke.'; this.cdr.markForCheck(); },
    });
  }

  // ---- invite ----
  toggleInvite(): void { this.inviteOpen = !this.inviteOpen; this.inviteError = null; this.inviteSent = false; }

  onInviteSend(): void {
    if (!this.canSendInvite) return;
    const link = this.links['invite'];
    if (!link?.href) { this.inviteError = 'Endpoint unavailable.'; return; }
    const payload = { email: (this.inviteEmail || '').trim().toLowerCase(), role: this.inviteRole };
    this.inviteError = null; this.inviteSent = false;
    this.auth.follow(link, payload, true).subscribe({
      next: () => {
        this.inviteSent = true; this.inviteEmail = '';
        this.cdr.markForCheck();
        setTimeout(() => { this.inviteSent = false; this.cdr.markForCheck(); }, 1500);
        this.refetch();
      },
      error: (e) => { this.inviteError = (e?.error?.detail) ?? 'Failed to send invite.'; this.cdr.markForCheck(); },
    });
  }

  // ---- shell callbacks (preserved; writes are local) ----
  inviteResult(ok: boolean, err?: string): void {
    if (ok) { this.inviteSent = true; this.inviteEmail = ''; } else { this.inviteError = err ?? 'Failed to send invite.'; }
    this.cdr.markForCheck();
  }
  roleResult(ok: boolean, err?: string): void {
    if (ok) { this.openMenuId = null; this.menuError = null; } else { this.menuError = err ?? 'Failed to update role.'; }
    this.cdr.markForCheck();
  }
}
