/**
 * AdminPortalTicketsComponent — `/admin/portal/tickets`
 *
 * Desktop redesign (web) per `web-admin-pages2.jsx` WebAdminTickets: shared slate
 * chrome + page header (status-bucket tabs + "New ticket" action) + a filter bar
 * (search · category rubric chips · source chips · sort) + a real <table> of
 * tickets. Row click expands an inline drawer to assign + change status.
 *
 * Reactive like the CRM list / bookings ledger: every filter (status tab /
 * category / source / search / sort) lives in LOCAL state and self-refetches
 * `bff.resolve(screen, params)` with stale-while-revalidate — NO router
 * navigation (it re-mounts the shell and flickers). Debounced live search.
 * Writes (create / assign / status) POST the real HATEOAS link, then refetch in
 * place (RN parity + preserves the active filter view). Mirrors RN `tickets.tsx`.
 *
 * Button audit vs RN + design: dropped the design's dead "Saved views" header
 * button and the fabricated sub copy ("median time to first response …"). Real
 * counts only — status-bucket + category counts come from the resolver.
 *
 * @Input/@Output contract + createResult() preserved (shell wiring intact).
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
import { BeautyAdminWebPageHeaderComponent, AdminWebTab } from '../admin-web/admin-web-page-header.component';

interface CategoryBucket { id: string; label: string; color: string; count: number; }
interface StatusBucket { id: string; label: string; count: number; }
interface TicketRow {
  id: number;
  priority: 'high' | 'med' | 'low' | string;
  priority_label: string;
  category: string;
  category_label: string;
  status: string;
  status_label: string;
  source: string;
  source_label: string;
  subject: string;
  from_label: string;
  from_principal_type: string;
  from_principal_id: number | null;
  assignee_email: string;
  age: string;
  sla: 'on-track' | 'breached';
}

@Component({
  selector: 'app-admin-portal-tickets',
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
      <app-admin-web-sidebar active="tickets"
        [adminName]="adminName" [adminEmail]="adminEmail" [badges]="navBadges"
        (follow)="followLink.emit($event)"></app-admin-web-sidebar>

      <div class="aw-col">
        <app-admin-web-topbar [notifCount]="notifCount" [adminName]="adminName" [adminEmail]="adminEmail"
          (follow)="followLink.emit($event)"></app-admin-web-topbar>
        <app-admin-web-session-bar [sessionRemaining]="sessionRemaining"
          (follow)="followLink.emit($event)"></app-admin-web-session-bar>

        <main class="aw-main" role="main">
          <app-admin-web-page-header
            [breadcrumb]="['Support tickets']"
            title="Support tickets"
            [sub]="summaryLine"
            [tabs]="statusTabs" [activeTab]="activeStatus"
            (tabSelect)="onStatus($event)">
            <div slot="actions" class="aw-hactions">
              <button type="button" class="aw-btn aw-btn--pri" (click)="toggleComposer()" [attr.aria-expanded]="composerOpen">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                New ticket
              </button>
            </div>
          </app-admin-web-page-header>

          <!-- Composer -->
          <div class="aw-composer-panel" *ngIf="composerOpen">
            <div class="aw-eyebrow">New ticket</div>
            <input class="aw-ti" type="text" [(ngModel)]="ncSubject" placeholder="Subject" aria-label="Subject" />
            <div class="aw-ti-row">
              <label class="aw-field">
                <span class="aw-field-l">Priority</span>
                <select [(ngModel)]="ncPriority" aria-label="Priority">
                  <option value="high">High</option><option value="med">Med</option><option value="low">Low</option>
                </select>
              </label>
              <label class="aw-field">
                <span class="aw-field-l">Category</span>
                <select [(ngModel)]="ncCategory" aria-label="Category">
                  <option *ngFor="let c of categoryRubric" [value]="c.id" [disabled]="c.id === 'all'">{{ c.label }}</option>
                </select>
              </label>
              <label class="aw-field">
                <span class="aw-field-l">Source</span>
                <select [(ngModel)]="ncSource" aria-label="Source">
                  <option value="in_app">In-app</option><option value="email">Email</option><option value="system">System</option>
                </select>
              </label>
            </div>
            <textarea class="aw-ti" rows="3" [(ngModel)]="ncBody" placeholder="Details (optional)" aria-label="Body"></textarea>
            <div class="aw-composer-actions">
              <span class="aw-hint err" *ngIf="ncError" role="alert">{{ ncError }}</span>
              <span class="aw-hint ok" *ngIf="ncSaved" role="status">Created.</span>
              <span class="grow"></span>
              <button type="button" class="aw-btn aw-btn--sec" (click)="composerOpen = false">Cancel</button>
              <button type="button" class="aw-btn aw-btn--pri" (click)="onCreate()" [disabled]="!ncSubject.trim()">Create ticket</button>
            </div>
          </div>

          <!-- Filter bar -->
          <div class="aw-filterbar">
            <div class="aw-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
              <input [(ngModel)]="searchInput" name="q" (ngModelChange)="onSearchChange()"
                     (keydown.enter)="onSearchSubmit()" placeholder="Ticket #, subject, customer, provider…" aria-label="Search tickets" />
              <button type="button" class="aw-clear" *ngIf="searchInput" (click)="clearSearch()" aria-label="Clear search">×</button>
            </div>

            <div class="aw-chips" role="group" aria-label="Category">
              <button type="button" *ngFor="let c of categoryRubric" class="aw-catchip"
                      [class.is-active]="activeCategory === c.id" (click)="onCategory(c.id)">
                <span class="aw-catdot" [style.background]="c.color"></span>
                {{ c.label }}<span class="aw-chip-count mono">{{ c.count }}</span>
              </button>
            </div>

            <span class="aw-divider" aria-hidden="true"></span>

            <div class="aw-chips" role="group" aria-label="Source">
              <button type="button" *ngFor="let s of sources" class="aw-chip"
                      [class.is-active]="activeSource === s.id" (click)="onSource(s.id)">
                {{ s.label }}
              </button>
            </div>

            <span class="grow"></span>
            <label class="aw-sort">
              <span class="aw-sort-label">Sort</span>
              <select [ngModel]="sort" (ngModelChange)="onSort($event)" aria-label="Sort tickets">
                <option *ngFor="let o of sortOptions" [value]="o.value">{{ o.label }}</option>
              </select>
            </label>
          </div>

          <div class="aw-body">
            <div class="aw-card aw-tablecard" [class.is-stale]="loading">
              <div class="aw-tabletop">
                <span class="mono">{{ rows.length }} ticket{{ rows.length === 1 ? '' : 's' }}</span>
                <span class="aw-loading" *ngIf="loading"><span class="aw-spin" aria-hidden="true"></span> updating…</span>
              </div>
              <table class="aw-table">
                <thead>
                  <tr>
                    <th class="c-id">ID</th>
                    <th class="c-prio">Priority</th>
                    <th>Subject</th>
                    <th class="c-from">From</th>
                    <th class="c-source">Source</th>
                    <th class="c-status">Status</th>
                    <th class="c-sla">SLA</th>
                    <th class="c-assignee">Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  <ng-container *ngFor="let t of rows">
                    <tr class="aw-trow" role="button" tabindex="0" [class.is-open]="expandedId === t.id"
                        (click)="toggleRow(t)" (keydown.enter)="toggleRow(t)"
                        (keydown.space)="toggleRow(t); $event.preventDefault()"
                        [attr.aria-expanded]="expandedId === t.id"
                        [attr.aria-label]="'Ticket #' + t.id + ' — ' + t.subject">
                      <td class="c-id mono">#{{ t.id }}</td>
                      <td class="c-prio">
                        <span class="aw-prio" [class.p-high]="t.priority === 'high'" [class.p-med]="t.priority === 'med'" [class.p-low]="t.priority === 'low'">{{ t.priority_label }}</span>
                      </td>
                      <td class="c-subj">
                        <span class="aw-subj">{{ t.subject }}</span>
                        <span class="aw-catpill" [style.background]="categoryColor(t.category) + '1A'" [style.color]="categoryColor(t.category)">{{ t.category_label }}</span>
                      </td>
                      <td class="c-from mono">{{ t.from_label || '—' }}</td>
                      <td class="c-source muted">{{ t.source_label }}</td>
                      <td class="c-status">
                        <span class="aw-st" [class]="'st-' + t.status">{{ t.status_label }}</span>
                      </td>
                      <td class="c-sla">
                        <span *ngIf="t.sla === 'breached'" class="aw-sla-bad mono">{{ t.age }}</span>
                        <span *ngIf="t.sla !== 'breached'" class="mono muted">{{ t.age }}</span>
                      </td>
                      <td class="c-assignee">
                        <span *ngIf="t.assignee_email" class="mono">{{ t.assignee_email }}</span>
                        <span *ngIf="!t.assignee_email" class="aw-unassigned">Unassigned</span>
                      </td>
                    </tr>
                    <tr *ngIf="expandedId === t.id" class="aw-drawer-row">
                      <td colspan="8">
                        <div class="aw-drawer">
                          <div class="aw-drawer-col">
                            <label class="aw-dl" [attr.for]="'assignee-' + t.id">Assignee</label>
                            <div class="aw-drawer-line">
                              <input class="aw-di" [id]="'assignee-' + t.id" type="email" [(ngModel)]="drawerAssignee" placeholder="email@beauty.io" />
                              <button type="button" class="aw-btn aw-btn--pri sm" (click)="onAssign(t)">Save</button>
                              <button type="button" class="aw-btn aw-btn--sec sm" (click)="onAssign(t, adminEmail)" *ngIf="!drawerAssignee">Assign to me</button>
                            </div>
                          </div>
                          <div class="aw-drawer-col">
                            <label class="aw-dl" [attr.for]="'status-' + t.id">Status</label>
                            <div class="aw-drawer-line">
                              <select class="aw-dsel" [id]="'status-' + t.id" [(ngModel)]="drawerStatus">
                                <option value="new">New</option>
                                <option value="in_progress">In progress</option>
                                <option value="waiting">Waiting on user</option>
                                <option value="resolved">Resolved</option>
                              </select>
                              <button type="button" class="aw-btn aw-btn--pri sm" (click)="onStatusChange(t)">Update</button>
                            </div>
                          </div>
                          <span class="aw-hint err" *ngIf="drawerError" role="alert">{{ drawerError }}</span>
                        </div>
                      </td>
                    </tr>
                  </ng-container>
                  <tr *ngIf="!rows.length"><td colspan="8" class="aw-empty">No tickets match these filters.</td></tr>
                </tbody>
              </table>
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

    .aw-hactions { display: flex; gap: 8px; align-items: center; }
    .aw-btn { height: 38px; padding: 0 14px; border-radius: 10px; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; line-height: 1; border: 1px solid transparent; }
    .aw-btn.sm { height: 30px; padding: 0 10px; font-size: 0.75rem; border-radius: 8px; }
    .aw-btn--sec { background: #fff; color: var(--text); border-color: var(--line); }
    .aw-btn--pri { background: #0F1115; color: #fff; border-color: #0F1115; }
    .aw-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* composer */
    .aw-composer-panel { margin: 16px 28px 0; background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
    .aw-eyebrow { font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; }
    .aw-ti { width: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 9px 11px; font-family: var(--font-body); font-size: 0.8125rem; color: var(--text); outline: none; margin-bottom: 8px; }
    .aw-ti:focus { border-color: var(--text); }
    textarea.aw-ti { resize: vertical; min-height: 64px; }
    .aw-ti-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .aw-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .aw-field-l { font-size: 0.5625rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); }
    .aw-field select { height: 36px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 0 8px; font-family: var(--font-body); font-size: 0.8125rem; color: var(--text); outline: none; cursor: pointer; }
    .aw-composer-actions { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .aw-hint { font-size: 0.6875rem; color: var(--text-muted); }
    .aw-hint.err { color: var(--danger); } .aw-hint.ok { color: var(--ok); }

    /* filter bar */
    .aw-filterbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 14px 28px; background: #fff; border-bottom: 1px solid var(--line); }
    .aw-search { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; height: 38px; padding: 0 12px; min-width: 260px; }
    .aw-search input { flex: 1; border: none; outline: none; background: transparent; font-family: var(--font-body); font-size: 0.8125rem; color: var(--text); }
    .aw-clear { background: #fff; border: 1px solid var(--line); border-radius: 999px; width: 20px; height: 20px; color: var(--text-muted); cursor: pointer; font-size: 0.875rem; line-height: 1; display: grid; place-items: center; padding: 0; }
    .aw-divider { width: 1px; height: 22px; background: var(--line); }

    .aw-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .aw-chip { height: 30px; padding: 0 11px; border-radius: 999px; background: #fff; border: 1px solid var(--line); font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; color: var(--text); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .aw-chip.is-active { background: #0F1115; color: #fff; border-color: #0F1115; }
    .aw-catchip { height: 30px; padding: 0 11px; border-radius: 999px; background: #fff; border: 1px solid var(--line); font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; color: var(--text); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .aw-catchip.is-active { background: #0F1115; color: #fff; border-color: #0F1115; }
    .aw-catdot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .aw-chip-count { font-size: 0.625rem; color: var(--text-muted); }
    .aw-catchip.is-active .aw-chip-count, .aw-chip.is-active .aw-chip-count { color: rgba(255,255,255,0.7); }

    .aw-sort { display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-muted); }
    .aw-sort select { appearance: none; background: #fff; border: 1px solid var(--line); border-radius: 8px; height: 32px; padding: 0 24px 0 10px; font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; color: var(--text); cursor: pointer; outline: none; }

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
    .aw-table td { padding: 12px; font-size: 0.8125rem; vertical-align: middle; border-top: 1px solid var(--surface); }
    .aw-trow { cursor: pointer; }
    .aw-trow:hover { background: #FAFAFA; }
    .aw-trow.is-open { background: #FAFAFA; }
    .aw-trow.is-open td { border-bottom: none; }
    .c-id { width: 64px; color: var(--text-muted); }
    .c-prio { width: 84px; }
    .c-from { width: 130px; }
    .c-source { width: 84px; }
    .c-status { width: 116px; }
    .c-sla { width: 70px; }
    .c-assignee { width: 170px; }
    .c-subj .aw-subj { font-weight: 600; }
    .aw-catpill { display: inline-block; margin-left: 8px; font-size: 0.5625rem; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; padding: 2px 7px; border-radius: 999px; vertical-align: middle; }
    .aw-prio { font-family: var(--font-mono); font-size: 0.6875rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.3px; background: var(--surface); color: var(--text-muted); }
    .aw-prio.p-high { background: #FCE8E5; color: var(--danger); }
    .aw-prio.p-med { background: #FFF4DA; color: var(--warn); }
    .aw-prio.p-low { background: var(--surface); color: var(--text-muted); }
    .aw-st { font-size: 0.625rem; font-weight: 700; padding: 3px 9px; border-radius: 999px; letter-spacing: 0.4px; text-transform: uppercase; }
    .aw-st.st-new { background: #FFF4DA; color: #8A6A1F; }
    .aw-st.st-in_progress { background: #E6F0FA; color: #1a3a52; }
    .aw-st.st-waiting { background: #F1E8DA; color: #7A5A1F; }
    .aw-st.st-resolved { background: #E5F3EA; color: var(--ok); }
    .aw-sla-bad { color: var(--danger); font-weight: 700; background: #FCE8E5; padding: 2px 6px; border-radius: 4px; font-size: 0.6875rem; }
    .aw-unassigned { color: var(--text-muted); font-style: italic; font-size: 0.75rem; }
    .aw-empty { padding: 28px 16px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }

    /* drawer */
    .aw-drawer-row td { padding: 0 12px 14px; border-top: none; background: #FAFAFA; }
    .aw-drawer { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-start; padding: 12px 14px; background: #fff; border: 1px solid var(--line); border-radius: 10px; }
    .aw-drawer-col { display: flex; flex-direction: column; gap: 6px; }
    .aw-dl { font-size: 0.5625rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); }
    .aw-drawer-line { display: flex; align-items: center; gap: 6px; }
    .aw-di { height: 32px; min-width: 220px; background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 0 10px; font-family: var(--font-body); font-size: 0.8125rem; outline: none; color: var(--text); }
    .aw-di:focus { border-color: var(--text); }
    .aw-dsel { height: 32px; min-width: 160px; background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 0 8px; font-family: var(--font-body); font-size: 0.8125rem; outline: none; color: var(--text); cursor: pointer; }

    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }
    @media screen and (max-width: 1100px) {
      .c-from, .c-source { display: none; }
    }
  `],
})
export class AdminPortalTicketsComponent {
  private _data: Record<string, unknown> = {};
  @Input() set data(v: Record<string, unknown>) { this._data = v || {}; this.local = null; this.syncSearch(); }
  get data(): Record<string, unknown> { return this._data; }
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
  // Preserved for shell wiring contract (writes are now performed in place;
  // these remain so beauty-shell's (createTicket)/(assignTicket)/(statusTicket)
  // bindings + the #adminPortalTickets ViewChild stay valid).
  @Output() createTicket = new EventEmitter<{ subject: string; priority: string; category: string; source: string; body: string }>();
  @Output() assignTicket = new EventEmitter<{ id: number; assignee_email: string }>();
  @Output() statusTicket = new EventEmitter<{ id: number; status: string }>();

  private local: Record<string, unknown> | null = null;
  private get d(): Record<string, unknown> { return this.local ?? this._data; }

  searchInput = '';
  loading = false;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  composerOpen = false;
  ncSubject = '';
  ncPriority = 'med';
  ncCategory = 'other';
  ncSource = 'in_app';
  ncBody = '';
  ncError: string | null = null;
  ncSaved = false;

  expandedId: number | null = null;
  drawerAssignee = '';
  drawerStatus = 'new';
  drawerError: string | null = null;

  readonly sources = [
    { id: '', label: 'All sources' },
    { id: 'in_app', label: 'In-app' },
    { id: 'email',  label: 'Email' },
    { id: 'system', label: 'System' },
  ];

  constructor(private auth: BeautyAuthService, private bff: BeautyBffService, private cdr: ChangeDetectorRef) {}

  private syncSearch(): void {
    if (this.searchTimer === null) this.searchInput = this.queryValue;
  }

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
  get rows(): TicketRow[] { return (this.d['rows'] as TicketRow[]) ?? []; }
  get categoryRubric(): CategoryBucket[] { return (this.d['category_rubric'] as CategoryBucket[]) ?? []; }
  get statusBuckets(): StatusBucket[] { return (this.d['status_buckets'] as StatusBucket[]) ?? []; }
  get statusTabs(): AdminWebTab[] {
    return this.statusBuckets.map((b) => ({ id: b.id, label: b.label, count: b.count }));
  }
  get activeCategory(): string { return (this.d['active_category'] as string) ?? 'all'; }
  get activeStatus(): string { return (this.d['active_status'] as string) ?? 'open'; }
  get activeSource(): string { return (this.d['active_source'] as string) ?? ''; }
  get queryValue(): string { return (this.d['q'] as string) ?? ''; }
  get sort(): string { return (this.d['sort'] as string) ?? 'sla'; }
  get sortOptions(): { value: string; label: string }[] {
    return (this.d['sort_options'] as { value: string; label: string }[]) ?? [];
  }
  get openCount(): number { return (this.d['open_count'] as number) ?? 0; }
  get slaCount(): number { return (this.d['sla_count'] as number) ?? 0; }
  get summaryLine(): string {
    return `${this.openCount} open · ${this.slaCount} over SLA`;
  }

  categoryColor(c: string): string {
    return this.categoryRubric.find((r) => r.id === c)?.color ?? '#6B6F77';
  }

  // ---- filters → in-place refetch (no router nav) ----
  private currentParams(extra: Record<string, string | null> = {}): Record<string, string> {
    const cur: Record<string, string> = {};
    if (this.activeCategory !== 'all') cur['cat'] = this.activeCategory;
    if (this.activeStatus !== 'open') cur['status'] = this.activeStatus;
    if (this.activeSource) cur['src'] = this.activeSource;
    if (this.queryValue) cur['q'] = this.queryValue;
    if (this.sort && this.sort !== 'sla') cur['sort'] = this.sort;
    for (const [k, v] of Object.entries(extra)) {
      if (v === null) delete cur[k];
      else cur[k] = v;
    }
    return cur;
  }

  private refetch(params: Record<string, string>): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.bff.resolve('beauty_admin_portal_tickets', params).subscribe({
      next: (resp) => {
        if (resp && resp.action === 'render' && resp.data) { this.local = resp.data as Record<string, unknown>; }
        this.loading = false;
        if (this.searchTimer === null) this.searchInput = this.queryValue;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  onCategory(id: string): void { this.refetch(this.currentParams({ cat: id === 'all' ? null : id })); }
  onStatus(id: string): void {
    if (id === this.activeStatus) return;
    this.refetch(this.currentParams({ status: id === 'open' ? null : id }));
  }
  onSource(id: string): void { this.refetch(this.currentParams({ src: this.activeSource === id ? null : (id || null) })); }
  onSort(value: string): void {
    if (value === this.sort) return;
    this.refetch(this.currentParams({ sort: value === 'sla' ? null : value }));
  }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      const v = (this.searchInput || '').trim();
      if (v === this.queryValue) return;
      this.refetch(this.currentParams({ q: v || null }));
    }, 250);
  }
  onSearchSubmit(): void {
    if (this.searchTimer) { clearTimeout(this.searchTimer); this.searchTimer = null; }
    const v = (this.searchInput || '').trim();
    if (v === this.queryValue) return;
    this.refetch(this.currentParams({ q: v || null }));
  }
  clearSearch(): void { this.searchInput = ''; this.onSearchSubmit(); }

  // ---- composer (create) ----
  toggleComposer(): void { this.composerOpen = !this.composerOpen; this.ncError = null; this.ncSaved = false; }

  onCreate(): void {
    const subject = (this.ncSubject || '').trim();
    if (!subject) { this.ncError = 'Subject required.'; return; }
    const link = this.links['create'];
    if (!link?.href) { this.ncError = 'Endpoint unavailable.'; return; }
    this.ncError = null;
    const payload = {
      subject, priority: this.ncPriority, category: this.ncCategory,
      source: this.ncSource, body: (this.ncBody || '').trim(),
    };
    this.auth.follow(link, payload, true).subscribe({
      next: () => {
        this.ncSaved = true; this.ncSubject = ''; this.ncBody = '';
        this.cdr.markForCheck();
        setTimeout(() => { this.composerOpen = false; this.ncSaved = false; this.cdr.markForCheck(); }, 900);
        this.refetch(this.currentParams());
      },
      error: (e) => { this.ncError = (e?.error?.detail) ?? 'Failed to create ticket.'; this.cdr.markForCheck(); },
    });
  }

  /** Shell callback (preserved). The write is now done in place, so this is a
   * defensive no-op kept for the contract. */
  createResult(ok: boolean, err?: string): void {
    if (ok) { this.ncSaved = true; this.ncSubject = ''; this.ncBody = ''; }
    else { this.ncError = err ?? 'Failed to create.'; }
    this.cdr.markForCheck();
  }

  // ---- row drawer (assign / status) ----
  toggleRow(t: TicketRow): void {
    if (this.expandedId === t.id) { this.expandedId = null; return; }
    this.expandedId = t.id;
    this.drawerAssignee = t.assignee_email || '';
    this.drawerStatus = t.status || 'new';
    this.drawerError = null;
  }

  onAssign(t: TicketRow, override?: string): void {
    const tmpl = this.links['assign_template'];
    if (!tmpl?.href) return;
    const email = (override ?? this.drawerAssignee).trim();
    const call: BffLink = { ...tmpl, href: tmpl.href.replace(':id', String(t.id)) };
    this.drawerError = null;
    this.auth.follow(call, { assignee_email: email }, true).subscribe({
      next: () => this.refetch(this.currentParams()),
      error: (e) => { this.drawerError = (e?.error?.detail) ?? 'Failed to assign.'; this.cdr.markForCheck(); },
    });
  }

  onStatusChange(t: TicketRow): void {
    const tmpl = this.links['status_template'];
    if (!tmpl?.href) return;
    const call: BffLink = { ...tmpl, href: tmpl.href.replace(':id', String(t.id)) };
    this.drawerError = null;
    this.auth.follow(call, { status: this.drawerStatus }, true).subscribe({
      next: () => this.refetch(this.currentParams()),
      error: (e) => { this.drawerError = (e?.error?.detail) ?? 'Failed to update.'; this.cdr.markForCheck(); },
    });
  }
}
