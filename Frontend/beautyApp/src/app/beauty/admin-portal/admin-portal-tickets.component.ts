/**
 * AdminPortalTicketsComponent — `/admin/portal/tickets`
 *
 * Support ticket list with category rubric, status buckets, search, and a
 * "+ New" button that creates a real BeautyAdminTicket row. Row tap opens a
 * status/assign drawer (inline expansion).
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import {
  AdmStatusBarComponent,
  AdmHomeIndicatorComponent,
  AdmTopHeaderComponent,
  AdmTabBarComponent,
  AdmFilterChipComponent,
  AdmBtnComponent,
} from './atoms';

interface CategoryBucket { id: string; label: string; color: string; count: number; }
interface StatusBucket { id: string; label: string; count: number; }
interface TicketRow {
  id: number;
  priority: 'high' | 'med' | 'low';
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
    AdmStatusBarComponent, AdmHomeIndicatorComponent,
    AdmTopHeaderComponent, AdmTabBarComponent,
    AdmFilterChipComponent, AdmBtnComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-app is-light adm-tickets">
      <adm-status-bar tone="slate"></adm-status-bar>
      <adm-top-header [notifCount]="notifCount"></adm-top-header>

      <header class="sub">
        <div class="head-text">
          <h1 class="title adm-display">Support tickets</h1>
          <div class="summary">
            <span class="num adm-mono">{{ openCount }}</span> open ·
            <span class="num adm-mono err">{{ slaCount }}</span> SLA breach{{ slaCount === 1 ? '' : 'es' }}
          </div>
        </div>
        <button type="button" class="new-btn" (click)="toggleComposer()">+ New</button>
      </header>

      <!-- Composer -->
      <div class="composer" *ngIf="composerOpen">
        <div class="adm-eyebrow on-light">New ticket</div>
        <input class="ti" type="text" [(ngModel)]="ncSubject" placeholder="Subject" aria-label="Subject" />
        <div class="ti-row">
          <select [(ngModel)]="ncPriority" aria-label="Priority">
            <option value="high">High</option><option value="med">Med</option><option value="low">Low</option>
          </select>
          <select [(ngModel)]="ncCategory" aria-label="Category">
            <option *ngFor="let c of categoryRubric" [value]="c.id" [disabled]="c.id === 'all'">{{ c.label }}</option>
          </select>
          <select [(ngModel)]="ncSource" aria-label="Source">
            <option value="in_app">In-app</option><option value="email">Email</option><option value="system">System</option>
          </select>
        </div>
        <textarea class="ti" rows="3" [(ngModel)]="ncBody" placeholder="Details (optional)" aria-label="Body"></textarea>
        <div class="composer-actions">
          <span class="hint err" *ngIf="ncError" role="alert">{{ ncError }}</span>
          <span class="hint ok" *ngIf="ncSaved" role="status">Created.</span>
          <span class="grow"></span>
          <adm-btn variant="secondary" size="sm" (press)="composerOpen = false">Cancel</adm-btn>
          <adm-btn variant="primary" size="sm" (press)="onCreate()" [disabled]="!ncSubject.trim()">Create ticket</adm-btn>
        </div>
      </div>

      <section class="filters">
        <div class="search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input [(ngModel)]="searchInput" name="q"
                 (keydown.enter)="onSearchSubmit()" (blur)="onSearchSubmit()"
                 placeholder="Ticket #, subject, customer, provider…" />
          <button type="button" class="clear" *ngIf="searchInput" (click)="clearSearch()" aria-label="Clear">×</button>
        </div>

        <div class="adm-eyebrow on-light rub-head">Rubric · Category</div>
        <div class="chips">
          <button type="button" *ngFor="let c of categoryRubric" class="cat-chip"
                  [class.is-active]="activeCategory === c.id"
                  (click)="onCategory(c.id)">
            <span class="dot" [style.background]="c.color"></span>
            {{ c.label }}
            <span class="cnt adm-mono">{{ c.count }}</span>
          </button>
        </div>

        <div class="adm-eyebrow on-light rub-head">Rubric · Status &amp; SLA</div>
        <div class="chips">
          <adm-filter-chip *ngFor="let b of statusBuckets"
                           [active]="activeStatus === b.id"
                           [count]="b.count"
                           (press)="onStatus(b.id)">
            {{ b.label }}
          </adm-filter-chip>
        </div>

        <div class="adm-eyebrow on-light rub-head">Rubric · Source</div>
        <div class="chips">
          <adm-filter-chip *ngFor="let s of sources"
                           [active]="activeSource === s.id"
                           (press)="onSource(s.id)">
            {{ s.label }}
          </adm-filter-chip>
        </div>
      </section>

      <main class="body adm-body--scroll" role="main">
        <div class="result-row">
          <span class="cnt adm-mono">{{ rows.length }} ticket{{ rows.length === 1 ? '' : 's' }}</span>
          <label class="sort-wrap">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
            <select class="sort-select" [ngModel]="sort" (ngModelChange)="onSort($event)" aria-label="Sort tickets">
              <option *ngFor="let o of sortOptions" [value]="o.value">{{ o.label }}</option>
            </select>
            <span class="caret">▾</span>
          </label>
        </div>

        <div *ngIf="!rows.length" class="empty">No tickets match these filters.</div>

        <div *ngFor="let t of rows" class="row" [class.is-open]="expandedId === t.id">
          <div class="row-h" (click)="toggleRow(t)" role="button" tabindex="0"
               (keydown.enter)="toggleRow(t)"
               (keydown.space)="toggleRow(t); $event.preventDefault()">
            <span class="prio-dot" [style.background]="priorityColor(t.priority)"></span>
            <span class="mono-id adm-mono">#{{ t.id }}</span>
            <span class="prio-label" [style.color]="priorityColor(t.priority)">{{ t.priority_label }}</span>
            <span class="cat-pill" [style.background]="categoryColor(t.category) + '1A'" [style.color]="categoryColor(t.category)">{{ t.category_label }}</span>
            <span class="grow"></span>
            <span *ngIf="t.sla === 'breached'" class="sla-badge">SLA · {{ t.age }}</span>
            <span *ngIf="t.sla !== 'breached'" class="age adm-mono">{{ t.age }}</span>
          </div>
          <div class="subj">{{ t.subject }}</div>
          <div class="meta">
            <span class="from">{{ t.from_label || '—' }}</span>
            <span class="source-pill">{{ t.source_label }}</span>
            <span class="grow"></span>
            <span class="assignee adm-mono">{{ t.assignee_email || 'Unassigned' }}</span>
            <span class="status-chip" [class]="'st-' + t.status">{{ t.status_label }}</span>
          </div>

          <!-- Inline drawer -->
          <div class="drawer" *ngIf="expandedId === t.id">
            <div class="drawer-row">
              <label class="dl">Assignee</label>
              <input class="di" type="email" [(ngModel)]="drawerAssignee" placeholder="email@beauty.io" />
              <button type="button" class="db" (click)="onAssign(t)">Save</button>
              <button type="button" class="db ghost" (click)="onAssign(t, adminEmail)" *ngIf="!drawerAssignee">Assign to me</button>
            </div>
            <div class="drawer-row">
              <label class="dl">Status</label>
              <select [(ngModel)]="drawerStatus">
                <option value="new">New</option>
                <option value="in_progress">In progress</option>
                <option value="waiting">Waiting on user</option>
                <option value="resolved">Resolved</option>
              </select>
              <button type="button" class="db" (click)="onStatusChange(t)">Update</button>
            </div>
          </div>
        </div>
      </main>

      <adm-tab-bar active="tickets" [badges]="tabBadges" (select)="onTab($event)"></adm-tab-bar>
      <adm-home-indicator tone="slate"></adm-home-indicator>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--surface); }
    .adm-tickets { min-height: 100dvh; }

    .sub { background: var(--adm-slate); color: #fff; padding: 12px 14px; border-bottom: 1px solid var(--adm-slate-line); display: flex; align-items: flex-end; justify-content: space-between; flex-shrink: 0; }
    .title { margin: 0; font-size: 24px; }
    .summary { font-size: 11px; color: var(--adm-slate-muted); margin-top: 2px; }
    .summary .num { color: #fff; font-weight: 600; }
    .summary .err { color: #FBD9D5; }
    .new-btn { height: 32px; padding: 0 12px; border-radius: 999px; background: #fff; color: var(--adm-slate); border: none; font-family: var(--adm-font-body); font-size: 12px; font-weight: 700; cursor: pointer; }

    .composer { background: #fff; border-bottom: 1px solid var(--line); padding: 10px 14px; }
    .composer .ti { width: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; font-family: var(--adm-font-body); font-size: 13px; color: var(--text); outline: none; margin-bottom: 8px; }
    .composer textarea { resize: vertical; min-height: 60px; }
    .ti-row { display: flex; gap: 6px; margin-bottom: 8px; }
    .ti-row select { flex: 1; height: 34px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 0 6px; font-family: var(--adm-font-body); font-size: 12px; color: var(--text); outline: none; }
    .composer-actions { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .composer-actions .grow { flex: 1; }
    .composer-actions .hint { font-size: 11px; color: var(--text-muted); }
    .composer-actions .hint.err { color: var(--danger); }
    .composer-actions .hint.ok { color: var(--adm-green); }

    .filters { background: var(--surface); border-bottom: 1px solid var(--line); padding: 10px 14px; flex-shrink: 0; }
    .search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--line); border-radius: 10px; height: 36px; padding: 0 12px; margin-bottom: 10px; }
    .search input { flex: 1; border: none; outline: none; background: transparent; font-family: var(--adm-font-body); font-size: 12.5px; color: var(--text); }
    .clear { background: var(--surface); border: 1px solid var(--line); border-radius: 999px; width: 20px; height: 20px; color: var(--text-muted); cursor: pointer; font-size: 14px; line-height: 1; display: grid; place-items: center; padding: 0; }
    .rub-head { margin: 4px 0 6px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }

    .cat-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; background: #fff; color: var(--text); border: 1px solid var(--line); font-family: var(--adm-font-body); font-size: 11px; font-weight: 600; cursor: pointer; }
    .cat-chip.is-active { background: #0F1115; color: #fff; border-color: #0F1115; }
    .cat-chip .dot { width: 6px; height: 6px; border-radius: 50%; }
    .cat-chip .cnt { font-size: 9.5px; font-weight: 500; color: var(--text-muted); }
    .cat-chip.is-active .cnt { color: rgba(255,255,255,0.7); }

    .body { padding: 0 0 24px; background: #fff; }
    .result-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #ECECEE; }
    .result-row .cnt { font-size: 11px; color: var(--text-muted); }
    .sort-label { font-family: var(--adm-font-body); font-size: 11.5px; color: var(--text); font-weight: 600; }
    .sort-wrap { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--text); }
    .sort-select { appearance: none; background: transparent; border: none; font-family: var(--adm-font-body); font-size: 11.5px; color: var(--text); font-weight: 600; padding: 0 18px 0 0; cursor: pointer; outline: none; }
    .sort-wrap .caret { font-size: 9px; opacity: 0.6; margin-left: -16px; pointer-events: none; }
    .empty { padding: 32px 16px; text-align: center; color: var(--text-muted); font-size: 12px; }

    .row { padding: 12px 14px; border-bottom: 1px solid #ECECEE; }
    .row-h { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .prio-dot { width: 6px; height: 6px; border-radius: 3px; }
    .mono-id { font-size: 11px; color: var(--text); font-weight: 600; }
    .prio-label { font-size: 10px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; }
    .cat-pill { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; padding: 2px 7px; border-radius: 999px; }
    .grow { flex: 1; }
    .sla-badge { font-family: var(--adm-font-mono); font-size: 10px; font-weight: 700; color: #C0392B; background: #FCE8E5; padding: 2px 6px; border-radius: 4px; }
    .age { font-family: var(--adm-font-mono); font-size: 10px; color: var(--text-muted); }
    .subj { font-size: 13px; color: var(--text); font-weight: 600; margin-top: 6px; }
    .meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
    .from { font-size: 11px; color: var(--text); }
    .source-pill { font-family: var(--adm-font-body); font-size: 10px; font-weight: 600; color: var(--text-muted); background: var(--surface); padding: 2px 6px; border-radius: 4px; }
    .assignee { font-size: 10px; color: var(--text-muted); }
    .status-chip { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; letter-spacing: 0.4px; text-transform: uppercase; }
    .status-chip.st-new          { background: #FFF4DA; color: #8A6A1F; }
    .status-chip.st-in_progress  { background: #E6F0FA; color: #1a3a52; }
    .status-chip.st-waiting      { background: #F1E8DA; color: #7A5A1F; }
    .status-chip.st-resolved     { background: #E5F3EA; color: #2F7A47; }

    .drawer { margin-top: 10px; padding: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; }
    .drawer-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
    .drawer-row:last-child { margin-bottom: 0; }
    .dl { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; min-width: 64px; }
    .di { flex: 1; height: 30px; background: #fff; border: 1px solid var(--line); border-radius: 7px; padding: 0 8px; font-family: var(--adm-font-body); font-size: 12px; outline: none; color: var(--text); }
    .drawer-row select { flex: 1; height: 30px; background: #fff; border: 1px solid var(--line); border-radius: 7px; padding: 0 6px; font-family: var(--adm-font-body); font-size: 12px; outline: none; color: var(--text); }
    .db { height: 30px; padding: 0 10px; border-radius: 8px; background: #0F1115; color: #fff; border: none; font-family: var(--adm-font-body); font-size: 11.5px; font-weight: 600; cursor: pointer; }
    .db.ghost { background: #fff; color: var(--text); border: 1px solid var(--line); }
  `],
})
export class AdminPortalTicketsComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
  @Output() createTicket = new EventEmitter<{ subject: string; priority: string; category: string; source: string; body: string }>();
  @Output() assignTicket = new EventEmitter<{ id: number; assignee_email: string }>();
  @Output() statusTicket = new EventEmitter<{ id: number; status: string }>();

  searchInput = '';
  private lastDataQ = '';

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

  readonly sources = [
    { id: 'in_app', label: 'In-app' },
    { id: 'email',  label: 'Email' },
    { id: 'system', label: 'System' },
  ];

  ngDoCheck(): void {
    const incoming = this.queryValue;
    if (incoming !== this.lastDataQ) {
      this.lastDataQ = incoming;
      this.searchInput = incoming;
    }
  }

  get rows(): TicketRow[] { return (this.data['rows'] as TicketRow[]) ?? []; }
  get categoryRubric(): CategoryBucket[] { return (this.data['category_rubric'] as CategoryBucket[]) ?? []; }
  get statusBuckets(): StatusBucket[] { return (this.data['status_buckets'] as StatusBucket[]) ?? []; }
  get activeCategory(): string { return (this.data['active_category'] as string) ?? 'all'; }
  get activeStatus(): string { return (this.data['active_status'] as string) ?? 'open'; }
  get activeSource(): string { return (this.data['active_source'] as string) ?? ''; }
  get queryValue(): string { return (this.data['q'] as string) ?? ''; }
  get sort(): string { return (this.data['sort'] as string) ?? 'sla'; }
  get sortOptions(): { value: string; label: string }[] {
    return (this.data['sort_options'] as { value: string; label: string }[]) ?? [];
  }
  get openCount(): number { return (this.data['open_count'] as number) ?? 0; }
  get slaCount(): number { return (this.data['sla_count'] as number) ?? 0; }
  get adminEmail(): string { return (this.data['admin_email'] as string) ?? ''; }

  priorityColor(p: string): string {
    return p === 'high' ? '#C0392B' : p === 'med' ? '#8A6A1F' : '#6B6F77';
  }
  categoryColor(c: string): string {
    return this.categoryRubric.find((r) => r.id === c)?.color ?? '#6B6F77';
  }

  private navWith(extra: Record<string, string | null>): void {
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
    const qs = new URLSearchParams(cur).toString();
    this.followLink.emit({
      rel: 'filter', href: null, method: 'NAV',
      screen: 'beauty_admin_portal_tickets',
      route: '/pogoda/beauty/admin/portal/tickets' + (qs ? '?' + qs : ''),
      prompt: null,
    });
  }

  onSort(value: string): void {
    if (value === this.sort) return;
    this.navWith({ sort: value === 'sla' ? null : value });
  }
  onCategory(id: string): void { this.navWith({ cat: id === 'all' ? null : id }); }
  onStatus(id: string): void { this.navWith({ status: id === 'open' ? null : id }); }
  onSource(id: string): void { this.navWith({ src: this.activeSource === id ? null : id }); }

  onSearchSubmit(): void {
    const v = (this.searchInput || '').trim();
    if (v === this.queryValue) return;
    this.navWith({ q: v || null });
  }
  clearSearch(): void { this.searchInput = ''; this.onSearchSubmit(); }

  toggleComposer(): void { this.composerOpen = !this.composerOpen; this.ncError = null; this.ncSaved = false; }

  onCreate(): void {
    const subject = (this.ncSubject || '').trim();
    if (!subject) return;
    this.createTicket.emit({
      subject,
      priority: this.ncPriority,
      category: this.ncCategory,
      source: this.ncSource,
      body: (this.ncBody || '').trim(),
    });
  }

  createResult(ok: boolean, err?: string): void {
    if (ok) {
      this.ncSaved = true;
      this.ncSubject = ''; this.ncBody = '';
      setTimeout(() => { this.composerOpen = false; this.ncSaved = false; }, 1000);
    } else {
      this.ncError = err ?? 'Failed to create.';
    }
  }

  toggleRow(t: TicketRow): void {
    if (this.expandedId === t.id) { this.expandedId = null; return; }
    this.expandedId = t.id;
    this.drawerAssignee = t.assignee_email || '';
    this.drawerStatus = t.status || 'new';
  }

  onAssign(t: TicketRow, override?: string): void {
    const email = (override ?? this.drawerAssignee).trim();
    this.assignTicket.emit({ id: t.id, assignee_email: email });
  }

  onStatusChange(t: TicketRow): void {
    this.statusTicket.emit({ id: t.id, status: this.drawerStatus });
  }

  onTab(kind: string): void {
    const link = this.links[kind === 'tickets' ? 'self' : kind];
    if (link) this.followLink.emit(link);
  }

  get tabBadges(): Record<string, number | string | null> {
    return (this.data['tab_badges'] as Record<string, number | string | null>) ?? {};
  }
}
