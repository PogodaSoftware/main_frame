/**
 * AdminPortalTeamComponent — `/admin/portal/team`
 *
 * Admin roster + role/permissions matrix + invite composer. Owner-only
 * actions surface only when `is_owner` is true (BFF-driven flag).
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import {
  AdmAvatarComponent,
  AdmBtnComponent,
  AdmCardComponent,
  AdmHomeIndicatorComponent,
  AdmStatusBarComponent,
  AdmTabBarComponent,
  AdmTopHeaderComponent,
} from './atoms';

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

interface InviteRow {
  id: number;
  email: string;
  role: string;
  role_label: string;
  expires_at: string;
}

interface RoleOption {
  value: string;
  label: string;
  color: string;
  bg: string;
}

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
    AdmAvatarComponent, AdmBtnComponent, AdmCardComponent,
    AdmHomeIndicatorComponent, AdmStatusBarComponent,
    AdmTabBarComponent, AdmTopHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-app is-light adm-team">
      <adm-status-bar tone="slate"></adm-status-bar>
      <adm-top-header [notifCount]="notifCount"></adm-top-header>

      <header class="sub">
        <div class="head-text">
          <h1 class="title adm-display">Admin team</h1>
          <div class="summary">
            <span class="num adm-mono">{{ totals.admins }}</span> admins ·
            <span class="num adm-mono">{{ totals.owners }}</span> owner{{ totals.owners === 1 ? '' : 's' }} ·
            <span class="num adm-mono">{{ totals.pending_invites }}</span> invite{{ totals.pending_invites === 1 ? '' : 's' }} pending
          </div>
        </div>
        <button type="button" class="new-btn" (click)="toggleInvite()" *ngIf="isOwner">+ Invite</button>
      </header>

      <main class="body adm-body--scroll" role="main">
        <!-- Admin rows -->
        <div *ngFor="let a of admins" class="row">
          <adm-avatar [initials]="a.initials" [size]="36" kind="customer"></adm-avatar>
          <div class="row-text">
            <div class="r-name">
              {{ a.name }}
              <span class="me-tag" *ngIf="a.is_me">you</span>
            </div>
            <div class="r-email adm-mono">{{ a.email || '—' }}</div>
            <div class="r-meta">
              <span class="role-pill"
                    [style.background]="a.role_bg" [style.color]="a.role_color">
                {{ a.role_label }}
              </span>
              <span class="last adm-mono">· Last active {{ a.last_active }}</span>
            </div>
          </div>
          <button type="button" class="kebab"
                  *ngIf="isOwner && !a.is_me"
                  [class.is-active]="openMenuId === a.principal_id"
                  (click)="toggleMenu(a)"
                  aria-label="More actions">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.6"/>
              <circle cx="12" cy="12" r="1.6"/>
              <circle cx="19" cy="12" r="1.6"/>
            </svg>
          </button>

          <div class="menu" *ngIf="openMenuId === a.principal_id">
            <div class="menu-row">
              <label class="ml">Role</label>
              <select [(ngModel)]="menuRole">
                <option *ngFor="let r of roleOptions" [value]="r.value">{{ r.label }}</option>
              </select>
              <button type="button" class="mb" (click)="onRoleSave(a)">Save</button>
            </div>
            <div class="menu-row">
              <button type="button" class="mb danger" (click)="onRevoke(a)">Revoke admin</button>
              <span class="hint err" *ngIf="menuError" role="alert">{{ menuError }}</span>
            </div>
          </div>
        </div>

        <!-- Pending invites -->
        <ng-container *ngIf="invites.length">
          <div class="adm-eyebrow on-light section-eyebrow">Pending invites</div>
          <div *ngFor="let inv of invites" class="row invite-row">
            <div class="inv-icon">&#64;</div>
            <div class="row-text">
              <div class="r-name">{{ inv.email }}</div>
              <div class="r-email adm-mono">expires {{ inv.expires_at | slice:0:10 }}</div>
              <div class="r-meta">
                <span class="role-pill" [style.background]="roleBg(inv.role)" [style.color]="roleColor(inv.role)">
                  {{ inv.role_label }}
                </span>
              </div>
            </div>
          </div>
        </ng-container>

        <!-- Permissions matrix -->
        <div class="adm-eyebrow on-light section-eyebrow">Role permissions · matrix</div>
        <div class="matrix-blurb">
          Authorization is per-role. Owners edit this matrix from
          <span class="adm-mono code">/admin/team/roles</span>.
        </div>
        <div class="matrix-wrap">
          <adm-card [padding]="0">
            <div class="m-head">
              <span class="m-h-label">Permission</span>
              <span *ngFor="let lab of permissionMatrix.role_labels; let i = index"
                    class="m-h-role" [style.color]="permissionMatrix.role_colors[i]">{{ lab }}</span>
            </div>
            <div *ngFor="let r of permissionMatrix.rows; let i = index"
                 class="m-row" [class.first]="i === 0">
              <span class="m-r-label">{{ r.label }}</span>
              <span *ngFor="let v of r.values" class="m-cell-wrap">
                <span class="m-cell"
                      [class.allowed]="v === 'Y'"
                      [class.approval]="v === 'A'"
                      [class.denied]="v === 'n'">
                  <ng-container [ngSwitch]="v">
                    <svg *ngSwitchCase="'Y'" width="11" height="11" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="3"
                         stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <span *ngSwitchCase="'A'" class="adm-mono approval-text">2nd</span>
                    <svg *ngSwitchDefault width="10" height="10" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2.6"
                         stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 12h14"/>
                    </svg>
                  </ng-container>
                </span>
              </span>
            </div>
            <div class="m-legend">
              <span class="leg"><span class="leg-sq allowed"></span> Allowed</span>
              <span class="leg"><span class="leg-sq approval"></span> 2nd-admin approval</span>
              <span class="leg"><span class="leg-sq denied"></span> Denied</span>
            </div>
          </adm-card>
        </div>

        <!-- Invite composer (owner-only) -->
        <ng-container *ngIf="isOwner">
          <div class="adm-eyebrow on-light section-eyebrow">Invite teammate</div>
          <div class="invite-wrap">
            <adm-card [padding]="14">
              <div class="adm-eyebrow on-light">Work email</div>
              <input class="ti" type="email" [(ngModel)]="inviteEmail"
                     placeholder="name@beauty.io" aria-label="Invite email" />
              <div class="adm-eyebrow on-light">Role</div>
              <div class="role-chips">
                <button type="button" *ngFor="let r of roleOptions"
                        class="role-chip" [class.is-active]="inviteRole === r.value"
                        [style.color]="r.color"
                        [style.background]="inviteRole === r.value ? r.bg : '#fff'"
                        [style.borderColor]="inviteRole === r.value ? r.color + '55' : '#DCDCDF'"
                        (click)="inviteRole = r.value">
                  {{ r.label }}
                </button>
              </div>
              <div class="invite-info">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
                <span>Invite is sent via email and expires in 72h. 2FA is required on first sign-in.</span>
              </div>
              <div class="invite-actions">
                <span class="hint err" *ngIf="inviteError" role="alert">{{ inviteError }}</span>
                <span class="hint ok" *ngIf="inviteSent" role="status">Invite sent.</span>
                <span class="grow"></span>
                <adm-btn variant="primary" size="lg" [full]="true"
                         [disabled]="!canSendInvite"
                         (press)="onInviteSend()">
                  Send invite →
                </adm-btn>
              </div>
            </adm-card>
          </div>
        </ng-container>

        <!-- Non-owner notice -->
        <div *ngIf="!isOwner" class="not-owner">
          <adm-card [padding]="14">
            <div class="not-owner-title">Owner role required</div>
            <div class="not-owner-body">
              You can view the admin roster and permissions matrix, but only
              Owners can invite, change roles, or revoke admin access.
            </div>
          </adm-card>
        </div>
      </main>

      <adm-tab-bar active="team"
                   [badges]="tabBadges"
                   (select)="onTab($event)"></adm-tab-bar>
      <adm-home-indicator tone="slate"></adm-home-indicator>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--surface); }
    .adm-team { min-height: 100dvh; }

    .sub { background: var(--adm-slate); color: #fff; padding: 12px 14px; border-bottom: 1px solid var(--adm-slate-line); display: flex; align-items: flex-end; justify-content: space-between; flex-shrink: 0; }
    .title { margin: 0; font-size: 24px; }
    .summary { font-size: 11px; color: var(--adm-slate-muted); margin-top: 2px; }
    .summary .num { color: #fff; font-weight: 600; }
    .new-btn { height: 32px; padding: 0 12px; border-radius: 999px; background: #fff; color: var(--adm-slate); border: none; font-family: var(--adm-font-body); font-size: 12px; font-weight: 700; cursor: pointer; }

    .body { padding: 0 0 24px; background: #fff; }
    .section-eyebrow { padding: 14px 14px 6px; background: var(--surface); }

    .row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid #ECECEE; position: relative; flex-wrap: wrap; }
    .row-text { flex: 1; min-width: 0; }
    .r-name { font-size: 13.5px; font-weight: 600; color: var(--text); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .r-email { font-size: 10.5px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .r-meta { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
    .role-pill { font-size: 9px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; padding: 2px 7px; border-radius: 999px; }
    .last { font-size: 10px; color: var(--text-muted); }
    .me-tag { background: var(--adm-slate); color: #fff; font-size: 8.5px; font-weight: 700; padding: 1px 6px; border-radius: 999px; letter-spacing: 0.4px; text-transform: uppercase; }

    .kebab { width: 28px; height: 28px; border: none; background: transparent; cursor: pointer; display: grid; place-items: center; color: var(--text-muted); border-radius: 999px; }
    .kebab.is-active { background: var(--surface); color: var(--text); }

    .menu { flex-basis: 100%; margin-top: 10px; padding: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; display: flex; flex-direction: column; gap: 6px; }
    .menu-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .ml { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; min-width: 48px; }
    .menu-row select { flex: 1; height: 30px; background: #fff; border: 1px solid var(--line); border-radius: 7px; padding: 0 6px; font-family: var(--adm-font-body); font-size: 12px; outline: none; color: var(--text); }
    .mb { height: 30px; padding: 0 10px; border-radius: 8px; background: #0F1115; color: #fff; border: none; font-family: var(--adm-font-body); font-size: 11.5px; font-weight: 600; cursor: pointer; }
    .mb.danger { background: var(--adm-red); }
    .hint { font-size: 11px; color: var(--text-muted); }
    .hint.err { color: var(--adm-red); }
    .hint.ok { color: #2F7A47; }

    .invite-row .inv-icon { width: 36px; height: 36px; border-radius: 50%; background: var(--surface-2); color: var(--text-muted); display: grid; place-items: center; font-weight: 700; }

    .matrix-blurb { padding: 0 14px 4px; background: var(--surface); font-size: 11px; color: var(--text-muted); line-height: 1.5; }
    .matrix-blurb .code { color: var(--text); }
    .matrix-wrap { padding: 4px 14px 14px; background: var(--surface); }
    .m-head { display: grid; grid-template-columns: 1fr 28px 28px 28px 28px; gap: 6px; padding: 10px 12px; background: #FAFAFA; border-bottom: 1px solid #ECECEE; }
    .m-h-label { font-size: 9px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); }
    .m-h-role { font-size: 9px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; text-align: center; }
    .m-row { display: grid; grid-template-columns: 1fr 28px 28px 28px 28px; gap: 6px; padding: 8px 12px; border-top: 1px solid #ECECEE; align-items: center; }
    .m-row.first { border-top: none; }
    .m-r-label { font-size: 12px; color: var(--text); }
    .m-cell-wrap { display: grid; place-items: center; }
    .m-cell { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; }
    .m-cell.allowed { background: #E5F3EA; color: #2F7A47; }
    .m-cell.approval { background: #F1E8DA; color: #7A5A1F; }
    .m-cell.denied { background: var(--surface); color: #B8BBC0; }
    .approval-text { font-size: 9px; font-weight: 700; letter-spacing: 0.3px; }
    .m-legend { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-top: 1px solid #ECECEE; background: #FAFAFA; font-size: 10px; color: var(--text-muted); flex-wrap: wrap; }
    .leg { display: inline-flex; align-items: center; gap: 4px; }
    .leg-sq { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
    .leg-sq.allowed { background: #E5F3EA; border: 1px solid #2F7A47; }
    .leg-sq.approval { background: #F1E8DA; border: 1px solid #7A5A1F; }
    .leg-sq.denied { background: var(--surface); border: 1px solid var(--line); }

    .invite-wrap { padding: 4px 14px 20px; background: var(--surface); }
    .ti { width: 100%; height: 38px; background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 0 10px; font-family: var(--adm-font-body); font-size: 12px; color: var(--text); outline: none; margin-bottom: 10px; box-sizing: border-box; }
    .role-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
    .role-chip { font-size: 10px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; padding: 4px 9px; border-radius: 999px; border: 1px solid var(--line); background: #fff; cursor: pointer; font-family: var(--adm-font-body); }
    .invite-info { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--surface); border-radius: 8px; margin-bottom: 10px; font-size: 11px; color: var(--text-muted); line-height: 1.5; }
    .invite-actions { display: flex; align-items: center; gap: 8px; flex-direction: column; }
    .invite-actions .grow { display: none; }

    .not-owner { padding: 14px; background: var(--surface); }
    .not-owner-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
    .not-owner-body { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
  `],
})
export class AdminPortalTeamComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
  @Output() inviteAdmin = new EventEmitter<{ email: string; role: string }>();
  @Output() changeRole = new EventEmitter<{ principal_id: number; role: string }>();
  @Output() revokeAdmin = new EventEmitter<{ principal_id: number; email: string }>();

  openMenuId: number | null = null;
  menuRole = 'support_agent';
  menuError: string | null = null;

  inviteEmail = '';
  inviteRole = 'support_agent';
  inviteError: string | null = null;
  inviteSent = false;
  inviteOpen = false;

  get admins(): AdminRow[] { return (this.data['admins'] as AdminRow[]) ?? []; }
  get invites(): InviteRow[] { return (this.data['invites'] as InviteRow[]) ?? []; }
  get totals(): Totals {
    return (this.data['totals'] as Totals) ?? { admins: 0, owners: 0, pending_invites: 0 };
  }
  get roleOptions(): RoleOption[] {
    return (this.data['role_options'] as RoleOption[]) ?? [];
  }
  get permissionMatrix(): PermissionMatrix {
    return (this.data['permission_matrix'] as PermissionMatrix) ?? {
      role_order: [], role_labels: [], role_colors: [], rows: [],
    };
  }
  get isOwner(): boolean { return Boolean(this.data['is_owner']); }

  get canSendInvite(): boolean {
    const e = (this.inviteEmail || '').trim();
    return e.length > 3 && e.includes('@') && !!this.inviteRole;
  }

  roleColor(value: string): string {
    return this.roleOptions.find((r) => r.value === value)?.color ?? '#6B6F77';
  }
  roleBg(value: string): string {
    return this.roleOptions.find((r) => r.value === value)?.bg ?? '#E9E9EB';
  }

  toggleMenu(a: AdminRow): void {
    if (this.openMenuId === a.principal_id) {
      this.openMenuId = null;
      this.menuError = null;
      return;
    }
    this.openMenuId = a.principal_id;
    this.menuRole = a.role;
    this.menuError = null;
  }

  onRoleSave(a: AdminRow): void {
    if (this.menuRole === a.role) {
      this.openMenuId = null;
      return;
    }
    this.changeRole.emit({ principal_id: a.principal_id, role: this.menuRole });
  }

  onRevoke(a: AdminRow): void {
    this.revokeAdmin.emit({ principal_id: a.principal_id, email: a.email });
  }

  toggleInvite(): void {
    this.inviteOpen = !this.inviteOpen;
    this.inviteError = null;
    this.inviteSent = false;
  }

  onInviteSend(): void {
    if (!this.canSendInvite) return;
    this.inviteError = null;
    this.inviteSent = false;
    this.inviteAdmin.emit({
      email: (this.inviteEmail || '').trim().toLowerCase(),
      role: this.inviteRole,
    });
  }

  inviteResult(ok: boolean, err?: string): void {
    if (ok) {
      this.inviteSent = true;
      this.inviteEmail = '';
      setTimeout(() => { this.inviteSent = false; }, 1500);
    } else {
      this.inviteError = err ?? 'Failed to send invite.';
    }
  }

  roleResult(ok: boolean, err?: string): void {
    if (ok) {
      this.openMenuId = null;
      this.menuError = null;
    } else {
      this.menuError = err ?? 'Failed to update role.';
    }
  }

  onTab(kind: string): void {
    const link = this.links[kind === 'team' ? 'self' : kind];
    if (link) this.followLink.emit(link);
  }

  get tabBadges(): Record<string, number | string | null> {
    const base = (this.data['tab_badges'] as Record<string, number | string | null>) ?? {};
    return { ...base, team: this.totals.pending_invites || null };
  }
}
