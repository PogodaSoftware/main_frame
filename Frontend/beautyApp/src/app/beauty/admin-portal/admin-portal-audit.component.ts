/**
 * AdminPortalAuditLogComponent — `/admin/portal/audit`
 *
 * Desktop redesign (web) per `web-admin-pages2.jsx` WebAdminAudit: shared slate
 * chrome + page header (total events) + a filter bar (actor search · action
 * filter chips) + a real <table> of audit events. Read-only — no write outputs.
 *
 * Reactive: actor search (debounced ~250ms) and action chips live in LOCAL state
 * and self-refetch `bff.resolve('beauty_admin_portal_audit', params)` with
 * stale-while-revalidate (opacity fade) — NO router navigation. Mirrors the
 * bookings-ledger / tickets pattern precisely.
 *
 * Button audit vs design: dropped the design's fabricated Export + Filter header
 * buttons (no audit-export endpoint exists; chips ARE the filter) and the
 * fabricated "Last 24h" / hardcoded admin-initial chips. Real action chips are
 * built from `action_values` returned by the resolver.
 *
 * @Input/@Output contract unchanged — shell wiring intact.
 */

import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component,
  EventEmitter, Input, Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import { BeautyBffService } from '../beauty-bff.service';
import { BeautyAdminWebSidebarComponent } from '../admin-web/admin-web-sidebar.component';
import { BeautyAdminWebTopbarComponent } from '../admin-web/admin-web-topbar.component';
import { BeautyAdminWebSessionBarComponent } from '../admin-web/admin-web-session-bar.component';
import { BeautyAdminWebPageHeaderComponent } from '../admin-web/admin-web-page-header.component';

interface AuditRow {
  id: number;
  when_label: string;
  when_iso: string;
  icon: string;
  color: string;
  title_html: string;
  meta: string;
  action: string;
  actor_email: string;
  actor_initials: string;
  actor_role: string;
  target_label: string;
  reason: string;
  ip: string;
}

@Component({
  selector: 'app-admin-portal-audit',
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
      <app-admin-web-sidebar active="audit"
        [adminName]="adminName" [adminEmail]="adminEmail" [badges]="navBadges"
        (follow)="followLink.emit($event)"></app-admin-web-sidebar>

      <div class="aw-col">
        <app-admin-web-topbar [notifCount]="notifCount" [adminName]="adminName" [adminEmail]="adminEmail"
          (follow)="followLink.emit($event)"></app-admin-web-topbar>
        <app-admin-web-session-bar [sessionRemaining]="sessionRemaining"
          (follow)="followLink.emit($event)"></app-admin-web-session-bar>

        <main class="aw-main" role="main">
          <app-admin-web-page-header
            [breadcrumb]="['Audit log']"
            title="Audit log"
            [sub]="summaryLine"></app-admin-web-page-header>

          <!-- Filter bar -->
          <div class="aw-filterbar">
            <div class="aw-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
              <input [(ngModel)]="actorInput" name="actor" (ngModelChange)="onActorChange()"
                     (keydown.enter)="onActorSubmit()" placeholder="Filter by actor email…" aria-label="Filter by actor" />
              <button type="button" class="aw-clear" *ngIf="actorInput" (click)="clearActor()" aria-label="Clear actor filter">×</button>
            </div>

            <div class="aw-chips" role="group" aria-label="Action filter">
              <button type="button" class="aw-chip" [class.is-active]="activeAction === ''"
                      (click)="onAction('')" aria-label="Show all actions">
                All
              </button>
              <button type="button" *ngFor="let a of actionValues" class="aw-chip"
                      [class.is-active]="activeAction === a"
                      (click)="onAction(a)"
                      [attr.aria-label]="'Filter by action ' + a">
                <span class="aw-actdot" [style.background]="actionColor(a)"></span>
                <span class="aw-actcode">{{ a }}</span>
              </button>
            </div>
          </div>

          <div class="aw-body">
            <div class="aw-card aw-tablecard" [class.is-stale]="loading">
              <div class="aw-tabletop">
                <span class="mono">{{ total | number }} event{{ total === 1 ? '' : 's' }}</span>
                <span class="aw-loading" *ngIf="loading"><span class="aw-spin" aria-hidden="true"></span> updating…</span>
              </div>
              <table class="aw-table" aria-label="Audit log">
                <thead>
                  <tr>
                    <th class="c-when">When</th>
                    <th class="c-who">Who</th>
                    <th class="c-action">Action</th>
                    <th class="c-target">Target</th>
                    <th class="c-reason">Reason</th>
                    <th class="c-ip">IP</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of rows" class="aw-trow" role="row"
                      [attr.aria-label]="r.action + ' by ' + r.actor_email">
                    <td class="c-when mono muted">{{ r.when_label }}</td>
                    <td class="c-who">
                      <div class="aw-who">
                        <span class="aw-avatar-sm">{{ r.actor_initials || 'AA' }}</span>
                        <div class="aw-who-text">
                          <div class="aw-who-email mono">{{ r.actor_email || '—' }}</div>
                          <div class="aw-who-role" *ngIf="r.actor_role">{{ r.actor_role }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="c-action">
                      <span class="aw-actpill" [style.borderLeftColor]="r.color">
                        <span class="aw-actdot-sm" [style.background]="r.color"></span>
                        <span class="aw-actcode mono">{{ r.action }}</span>
                      </span>
                    </td>
                    <td class="c-target">{{ r.target_label || '—' }}</td>
                    <td class="c-reason muted">{{ r.reason || '—' }}</td>
                    <td class="c-ip mono muted">{{ r.ip || '—' }}</td>
                  </tr>
                  <tr *ngIf="!rows.length">
                    <td colspan="6" class="aw-empty">No audit events match these filters.</td>
                  </tr>
                </tbody>
              </table>
              <div class="aw-tablefoot mono" *ngIf="rows.length">
                Showing {{ rows.length | number }} most recent · immutable
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
    .grow { flex: 1; }
    .muted { color: var(--text-muted); }

    .aw-shell { display: flex; width: 100%; height: 100dvh; background: var(--surface); font-family: var(--font-body); color: var(--text); overflow: hidden; }
    .aw-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .aw-main { flex: 1; overflow: auto; background: var(--surface); }
    .aw-body { padding: 0 28px 32px; }

    /* filter bar */
    .aw-filterbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 14px 28px; background: #fff; border-bottom: 1px solid var(--line); }
    .aw-search { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; height: 38px; padding: 0 12px; min-width: 260px; }
    .aw-search input { flex: 1; border: none; outline: none; background: transparent; font-family: var(--font-body); font-size: 0.8125rem; color: var(--text); }
    .aw-clear { background: #fff; border: 1px solid var(--line); border-radius: 999px; width: 20px; height: 20px; color: var(--text-muted); cursor: pointer; font-size: 0.875rem; line-height: 1; display: grid; place-items: center; padding: 0; }

    .aw-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .aw-chip { height: 30px; padding: 0 11px; border-radius: 999px; background: #fff; border: 1px solid var(--line); font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; color: var(--text); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .aw-chip.is-active { background: #0F1115; color: #fff; border-color: #0F1115; }
    .aw-chip.is-active .aw-actdot { opacity: 0.8; }
    .aw-actdot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .aw-actcode { font-family: var(--font-mono); font-size: 0.6875rem; }

    /* table */
    .aw-tablecard { background: #fff; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; margin-top: 20px; transition: opacity 120ms ease; }
    .aw-tablecard.is-stale { opacity: 0.6; }
    .aw-tabletop { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--line); font-size: 0.6875rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); }
    .aw-loading { display: inline-flex; align-items: center; gap: 6px; text-transform: none; letter-spacing: 0; font-weight: 400; }
    .aw-spin { width: 11px; height: 11px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--text); display: inline-block; animation: aw-spin 0.7s linear infinite; }
    @keyframes aw-spin { to { transform: rotate(360deg); } }

    .aw-table { width: 100%; border-collapse: collapse; }
    .aw-table thead tr { background: var(--surface); border-bottom: 1px solid var(--line); }
    .aw-table th { padding: 10px 12px; font-size: 0.625rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); text-align: left; }
    .aw-table td { padding: 11px 12px; font-size: 0.8125rem; vertical-align: middle; border-top: 1px solid var(--surface); }
    .aw-trow:hover { background: #FAFAFA; }

    /* column widths */
    .c-when  { width: 68px; }
    .c-who   { min-width: 180px; }
    .c-action { width: 200px; }
    .c-target { min-width: 130px; }
    .c-reason { min-width: 100px; font-size: 0.75rem; }
    .c-ip    { width: 120px; font-size: 0.75rem; }

    /* Who cell */
    .aw-who { display: flex; align-items: center; gap: 10px; }
    .aw-avatar-sm { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #C8A57E, #6B4F3A); color: #fff; display: grid; place-items: center; font-size: 0.5625rem; font-weight: 700; flex-shrink: 0; font-family: var(--font-body); }
    .aw-who-text { min-width: 0; }
    .aw-who-email { font-size: 0.6875rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .aw-who-role { font-size: 0.5625rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600; margin-top: 2px; }

    /* Action cell pill */
    .aw-actpill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 7px; border-radius: 6px; border-left: 3px solid transparent; background: var(--surface); }
    .aw-actdot-sm { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .aw-actpill .aw-actcode { font-size: 0.6875rem; font-family: var(--font-mono); color: var(--text); }

    .aw-empty { padding: 28px 16px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }
    .aw-tablefoot { padding: 12px 16px; border-top: 1px solid var(--line); background: #F8F8F8; font-size: 0.6875rem; color: var(--text-muted); }

    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }
  `],
})
export class AdminPortalAuditLogComponent {
  private _data: Record<string, unknown> = {};
  @Input() set data(v: Record<string, unknown>) { this._data = v || {}; this.local = null; this.syncActor(); }
  get data(): Record<string, unknown> { return this._data; }
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  private local: Record<string, unknown> | null = null;
  private get d(): Record<string, unknown> { return this.local ?? this._data; }

  actorInput = '';
  loading = false;
  private actorTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private bff: BeautyBffService, private cdr: ChangeDetectorRef) {}

  private syncActor(): void {
    if (this.actorTimer === null) this.actorInput = this.actorValue;
  }

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
  get rows(): AuditRow[] { return (this.d['rows'] as AuditRow[]) ?? []; }
  get total(): number { return (this.d['total'] as number) ?? this.rows.length; }
  get actionValues(): string[] { return (this.d['action_values'] as string[]) ?? []; }
  get activeAction(): string {
    const f = this.d['filters'] as { action?: string; actor?: string } | undefined;
    return f?.action ?? '';
  }
  get actorValue(): string {
    const f = this.d['filters'] as { action?: string; actor?: string } | undefined;
    return f?.actor ?? '';
  }
  get summaryLine(): string {
    const filtered = this.activeAction || this.actorValue;
    const noun = filtered ? 'matching event' : 'event';
    const tail = filtered ? 'filtered view' : 'every admin action, immutable';
    return `${this.total} ${noun}${this.total === 1 ? '' : 's'} · ${tail}`;
  }

  /** Map an action code to its dot color (consistent with resolver _ACTION_STYLE). */
  actionColor(action: string): string {
    const map: Record<string, string> = {
      'account.suspend': '#C0392B',
      'account.reinstate': '#2F7A47',
      'account.export': '#0F1115',
      'team.invite': '#2F7A47',
      'team.invite_consumed': '#2F7A47',
      'team.role': '#7A5A1F',
      'team.revoke': '#C0392B',
      'tag.create': '#7DA8CF',
      'note.create': '#7DA8CF',
      'message.send': '#7DA8CF',
      'ticket.create': '#7DA8CF',
      'ticket.assign': '#7DA8CF',
      'ticket.status': '#7DA8CF',
    };
    return map[action] ?? '#6B6F77';
  }

  // ---- filters → in-place refetch (no router nav) ----
  private currentParams(extra: Record<string, string | null> = {}): Record<string, string> {
    const cur: Record<string, string> = {};
    if (this.activeAction) cur['action'] = this.activeAction;
    if (this.actorValue) cur['actor'] = this.actorValue;
    for (const [k, v] of Object.entries(extra)) {
      if (v === null) delete cur[k];
      else cur[k] = v;
    }
    return cur;
  }

  private refetch(params: Record<string, string>): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.bff.resolve('beauty_admin_portal_audit', params).subscribe({
      next: (resp) => {
        if (resp && resp.action === 'render' && resp.data) { this.local = resp.data as Record<string, unknown>; }
        this.loading = false;
        if (this.actorTimer === null) this.actorInput = this.actorValue;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  onAction(action: string): void {
    if (action === this.activeAction) return;
    this.refetch(this.currentParams({ action: action || null }));
  }

  onActorChange(): void {
    if (this.actorTimer) clearTimeout(this.actorTimer);
    this.actorTimer = setTimeout(() => {
      this.actorTimer = null;
      const v = (this.actorInput || '').trim();
      if (v === this.actorValue) return;
      this.refetch(this.currentParams({ actor: v || null }));
    }, 250);
  }

  onActorSubmit(): void {
    if (this.actorTimer) { clearTimeout(this.actorTimer); this.actorTimer = null; }
    const v = (this.actorInput || '').trim();
    if (v === this.actorValue) return;
    this.refetch(this.currentParams({ actor: v || null }));
  }

  clearActor(): void {
    this.actorInput = '';
    this.onActorSubmit();
  }
}
