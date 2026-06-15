/**
 * AdminPortalCrmListComponent — `/admin/portal/crm`
 *
 * Desktop redesign (web) per `web-admin-pages.jsx` WebAdminCRM. Shared slate
 * chrome (sidebar + topbar + session strip) + a content area: page header with
 * Customers/Providers tabs, a white filter strip (search · status chips · real
 * tag chips · advanced filters · sort), an optional slate bulk-action bar, a
 * real `<table>`, and a pagination footer.
 *
 * Drives every list variant (customers/providers, status, tag, advanced
 * filters, search, bulk) through the existing query-param re-resolve contract.
 * The @Input/@Output contract and screen key are unchanged; tags now come from
 * the resolver (`data.tags`) rather than a hardcoded fixture.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import { BeautyBffService } from '../beauty-bff.service';
import { BeautyAdminWebSidebarComponent, AdminWebNav } from '../admin-web/admin-web-sidebar.component';
import { BeautyAdminWebTopbarComponent } from '../admin-web/admin-web-topbar.component';
import { BeautyAdminWebSessionBarComponent } from '../admin-web/admin-web-session-bar.component';
import { BeautyAdminWebPageHeaderComponent, AdminWebTab } from '../admin-web/admin-web-page-header.component';

interface CrmRow {
  id: number;
  initials: string;
  name: string;
  email: string;
  status: 'Active' | 'Suspended' | 'Pending' | 'Deleted' | 'Flagged';
  tags: string[];
  meta1: string;
  meta2: string;
  meta3: string;
  lifetime: string;
}

interface CrmTag { id: string; label: string; color: string; tone: string; count: number; }
interface StatusBucket { id: 'All' | 'Active' | 'Pending' | 'Suspended' | 'Flagged' | 'Deleted'; count: number; }

@Component({
  selector: 'app-admin-portal-crm-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BeautyAdminWebSidebarComponent,
    BeautyAdminWebTopbarComponent,
    BeautyAdminWebSessionBarComponent,
    BeautyAdminWebPageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-web aw-shell">
      <app-admin-web-sidebar [active]="sidebarActive"
        [adminName]="adminName" [adminEmail]="adminEmail" [badges]="navBadges"
        (follow)="followLink.emit($event)"></app-admin-web-sidebar>

      <div class="aw-col">
        <app-admin-web-topbar [notifCount]="notifCount" [adminName]="adminName" [adminEmail]="adminEmail"
          (follow)="followLink.emit($event)"></app-admin-web-topbar>
        <app-admin-web-session-bar [sessionRemaining]="sessionRemaining"
          (follow)="followLink.emit($event)"></app-admin-web-session-bar>

        <main class="aw-main" role="main">
          <app-admin-web-page-header
            [breadcrumb]="['CRM', type === 'providers' ? 'Providers' : 'Customers']"
            [title]="type === 'providers' ? 'Business providers' : 'Customers'"
            [sub]="headerSub"
            [tabs]="tabs" [activeTab]="type" (tabSelect)="onType($any($event))">
            <div slot="actions" class="aw-hactions">
              <button type="button" class="aw-btn aw-btn--sec" (click)="onManage()">Manage tags</button>
              <button type="button" class="aw-btn aw-btn--pri" (click)="onManage()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Add tag
              </button>
            </div>
          </app-admin-web-page-header>

          <!-- Filter strip -->
          <div class="aw-filter">
            <div class="aw-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
              <input [ngModel]="search" (ngModelChange)="onSearchInput($event)" name="q"
                     placeholder="Search name, email, phone, ID…"
                     (keydown.enter)="onSearchSubmit()" aria-label="Search accounts" />
              <button type="button" class="aw-search-clear" *ngIf="search" (click)="clearSearch()" aria-label="Clear search">×</button>
            </div>
            <button type="button" class="aw-chip" *ngFor="let b of statusBuckets"
                    [class.is-on]="activeStatus === b.id" (click)="onStatus(b.id)">
              {{ b.id }}<span class="aw-chip-count" *ngIf="b.count">{{ fmt(b.count) }}</span>
            </button>
            <span class="aw-divider"></span>
            <button type="button" class="aw-tagchip" *ngFor="let t of tagList"
                    [class.is-on]="activeTagIds.includes(t.id)"
                    [style.background]="activeTagIds.includes(t.id) ? t.color : t.tone"
                    [style.color]="activeTagIds.includes(t.id) ? '#fff' : t.color"
                    [style.borderColor]="activeTagIds.includes(t.id) ? t.color : (t.color + '33')"
                    (click)="onTag(t.id)" [attr.aria-pressed]="activeTagIds.includes(t.id)">
              <span class="aw-tagdot" [style.background]="activeTagIds.includes(t.id) ? '#fff' : t.color"></span>{{ t.label }}
            </button>
            <button type="button" class="aw-tag-add" (click)="onManage()">+ Tag</button>
            <span class="aw-grow"></span>
            <button type="button" class="aw-chip" *ngFor="let f of advancedFilters"
                    [class.is-on]="isAdvancedActive(f.key)" (click)="toggleAdvanced(f)">{{ f.label }}</button>
          </div>

          <!-- Bulk action bar -->
          <div class="aw-bulkbar" *ngIf="selected.size > 0">
            <span class="aw-bb-count">{{ selected.size }} selected</span>
            <span class="aw-grow"></span>
            <button type="button" class="aw-bb-btn" (click)="onBulkTag()">Tag</button>
            <button type="button" class="aw-bb-btn is-danger" (click)="onBulkSuspend()">Suspend</button>
            <button type="button" class="aw-bb-clear" (click)="clearSel()">Clear ×</button>
          </div>

          <!-- Result count + live loading indicator -->
          <div class="aw-resultrow">
            <span class="mono">{{ fmt(filteredTotal) }} results</span>
            <span class="aw-loading" *ngIf="loading"><span class="aw-spin" aria-hidden="true"></span> updating…</span>
          </div>

          <!-- Table -->
          <div class="aw-tablewrap" [class.is-stale]="loading">
            <div class="aw-card">
              <table class="aw-table">
                <thead>
                  <tr>
                    <th class="c-cb"><span class="sr-only">Select</span></th>
                    <th class="c-acct">Account</th>
                    <th class="c-tags">Tags</th>
                    <th class="c-status">Status</th>
                    <th class="c-life">Lifetime</th>
                    <th class="c-bk">Bookings</th>
                    <th class="c-seen">Last seen</th>
                    <th class="c-act"><span class="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of rows" class="aw-trow" (click)="openDetail(r)"
                      role="link" tabindex="0" (keydown.enter)="openDetail(r)"
                      [attr.aria-label]="'Open ' + r.name + ' detail'">
                    <td class="c-cb" (click)="$event.stopPropagation()">
                      <input type="checkbox" [checked]="selected.has(r.id)" (change)="toggleSel(r.id)"
                             [attr.aria-label]="'Select ' + r.name" />
                    </td>
                    <td class="c-acct">
                      <div class="aw-acct">
                        <span class="aw-avatar" [class.provider]="type === 'providers'" aria-hidden="true">{{ r.initials }}</span>
                        <span class="aw-acct-text">
                          <span class="aw-acct-name">{{ r.name }}</span>
                          <span class="aw-acct-sub mono">{{ r.email }} · {{ idLabel(r) }}</span>
                        </span>
                      </div>
                    </td>
                    <td class="c-tags">
                      <span class="aw-schip" *ngFor="let t of r.tags" [ngClass]="statusClass(t)">{{ t }}</span>
                    </td>
                    <td class="c-status"><span class="aw-schip" [ngClass]="statusClass(r.status)">{{ r.status }}</span></td>
                    <td class="c-life mono">{{ r.lifetime }}</td>
                    <td class="c-bk mono">{{ r.meta2 }}</td>
                    <td class="c-seen mono">{{ r.meta3 }}</td>
                    <td class="c-act" (click)="$event.stopPropagation()">
                      <button type="button" class="aw-kebab" (click)="openSuspend(r)"
                              [attr.aria-label]="(r.status === 'Suspended' ? 'Reinstate ' : 'Suspend ') + r.name">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="!rows.length"><td colspan="8" class="aw-empty">No accounts match these filters.</td></tr>
                </tbody>
              </table>
              <div class="aw-tfoot">
                <span class="mono">Showing 1–{{ rows.length }} of {{ fmt(filteredTotal) }}</span>
                <span class="mono" *ngIf="filteredTotal > rows.length">Refine filters to narrow results</span>
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
      --surface: #F2F2F2; --surface-2: #E9E9EB; --green: #2F7A47; --danger: #C0392B; --amber: #8A6A1F;
      --admin-red: #B23A2D;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh;
    }
    * { box-sizing: border-box; }
    .mono { font-family: var(--font-mono); }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

    .aw-shell { display: flex; width: 100%; height: 100dvh; background: var(--surface); font-family: var(--font-body); color: var(--text); overflow: hidden; }
    .aw-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .aw-main { flex: 1; overflow: auto; background: var(--surface); }

    .aw-hactions { display: flex; gap: 8px; align-items: center; }
    .aw-btn { height: 38px; padding: 0 14px; border-radius: 10px; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; line-height: 1; }
    .aw-btn--sec { background: #fff; color: var(--text); border: 1px solid var(--line); }
    .aw-btn--pri { background: #0F1115; color: #fff; border: 1px solid #0F1115; }
    .aw-btn--sm { height: 32px; padding: 0 12px; font-size: 0.75rem; }
    .aw-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .aw-filter {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      padding: 14px 28px; background: #fff; border-bottom: 1px solid var(--line);
    }
    .aw-search { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; height: 36px; padding: 0 12px; min-width: 280px; }
    .aw-search input { flex: 1; border: none; outline: none; background: transparent; font-family: var(--font-body); font-size: 0.8125rem; color: var(--text); }
    .aw-search input::placeholder { color: var(--text-muted); }
    .aw-search-clear { background: #fff; border: 1px solid var(--line); border-radius: 999px; width: 20px; height: 20px; color: var(--text-muted); cursor: pointer; line-height: 1; display: grid; place-items: center; padding: 0; }
    .aw-grow { flex: 1; }
    .aw-divider { width: 1px; height: 24px; background: var(--line); }

    .aw-chip { background: #fff; color: var(--text); border: 1px solid var(--line); border-radius: 999px; height: 30px; padding: 0 12px; font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; line-height: 1; }
    .aw-chip:hover { border-color: #0F1115; }
    .aw-chip.is-on { background: #0F1115; color: #fff; border-color: #0F1115; }
    .aw-chip-count { font-family: var(--font-mono); font-size: 0.625rem; font-weight: 600; color: var(--text-muted); background: var(--surface); padding: 1px 5px; border-radius: 999px; }
    .aw-chip.is-on .aw-chip-count { color: #fff; background: rgba(255,255,255,0.18); }

    .aw-tagchip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; border: 1px solid; font-family: var(--font-body); font-size: 0.6875rem; font-weight: 600; cursor: pointer; white-space: nowrap; line-height: 1.2; }
    .aw-tagdot { width: 6px; height: 6px; border-radius: 50%; }
    .aw-tag-add { padding: 5px 10px; border-radius: 999px; background: #fff; border: 1px dashed var(--line); font-family: var(--font-body); font-size: 0.6875rem; color: var(--text-muted); cursor: pointer; }

    .aw-bulkbar { background: #0F1115; color: #fff; padding: 10px 28px; display: flex; align-items: center; gap: 14px; }
    .aw-bb-count { font-size: 0.75rem; font-weight: 600; }
    .aw-bb-btn { height: 30px; padding: 0 12px; border-radius: 8px; background: #fff; color: #0F1115; border: 1px solid #fff; font-family: var(--font-body); font-size: 0.75rem; font-weight: 600; cursor: pointer; }
    .aw-bb-btn.is-danger { background: transparent; color: #fff; border-color: rgba(255,255,255,0.4); }
    .aw-bb-clear { background: transparent; border: none; color: rgba(255,255,255,0.7); font-size: 0.75rem; cursor: pointer; }

    .aw-resultrow { display: flex; align-items: center; gap: 12px; padding: 12px 28px 0; }
    .aw-resultrow .mono { font-size: 0.6875rem; color: var(--text-muted); }
    .aw-loading { display: inline-flex; align-items: center; gap: 6px; font-size: 0.6875rem; color: var(--text-muted); }
    .aw-spin { width: 11px; height: 11px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--text); display: inline-block; animation: aw-spin 0.7s linear infinite; }
    @keyframes aw-spin { to { transform: rotate(360deg); } }

    .aw-tablewrap { padding: 12px 28px 28px; transition: opacity 120ms ease; }
    .aw-tablewrap.is-stale { opacity: 0.6; }
    .aw-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
    .aw-table { width: 100%; border-collapse: collapse; }
    .aw-table thead tr { background: var(--surface); border-bottom: 1px solid var(--line); }
    .aw-table th { padding: 10px 14px; font-family: var(--font-body); font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); text-align: left; }
    .aw-table th.c-cb, .aw-table td.c-cb { width: 40px; text-align: center; }
    .aw-table th.c-act, .aw-table td.c-act { width: 56px; text-align: center; }
    .aw-table th.c-tags { width: 170px; }
    .aw-table th.c-status { width: 110px; }
    .aw-table th.c-life, .aw-table th.c-bk { width: 110px; }
    .aw-table th.c-seen { width: 130px; }
    .aw-trow { border-bottom: 1px solid var(--surface); height: 56px; cursor: pointer; }
    .aw-trow:last-child { border-bottom: none; }
    .aw-trow:hover { background: var(--surface); }
    .aw-table td { padding: 8px 14px; font-size: 0.8125rem; color: var(--text); vertical-align: middle; }
    .aw-table td.mono { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); }

    .aw-acct { display: flex; align-items: center; gap: 10px; }
    .aw-avatar { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; background: linear-gradient(135deg, #C8A57E, #6B4F3A); color: #fff; display: grid; place-items: center; font-size: 0.6875rem; font-weight: 700; box-shadow: 0 0 0 1px var(--line); }
    .aw-avatar.provider { background: linear-gradient(135deg, #CFE3F5, #7DA8CF); }
    .aw-acct-text { min-width: 0; }
    .aw-acct-name { display: block; font-size: 0.8125rem; font-weight: 600; color: var(--text); }
    .aw-acct-sub { display: block; font-size: 0.625rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .aw-schip { display: inline-flex; align-items: center; height: 22px; padding: 0 10px; border-radius: 999px; font-family: var(--font-body); font-size: 0.625rem; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; line-height: 1; margin-right: 4px; }
    .s-green { background: #E5F3EA; color: var(--green); }
    .s-red { background: #FCE8E5; color: var(--danger); }
    .s-amber { background: #FFF4DA; color: var(--amber); }
    .s-grey { background: var(--surface-2); color: var(--text-muted); }
    .s-gold { background: #F1E8DA; color: #7A5A1F; }

    .aw-kebab { width: 28px; height: 28px; border: none; background: transparent; cursor: pointer; display: grid; place-items: center; color: var(--text-muted); border-radius: 6px; }
    .aw-kebab:hover { background: var(--surface-2); }

    .aw-empty { padding: 32px 14px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }
    .aw-tfoot { padding: 12px 18px; border-top: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; background: #F8F8F8; }
    .aw-tfoot .mono { font-size: 0.6875rem; color: var(--text-muted); }
    .aw-pager { display: flex; gap: 6px; }

    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }

    @media screen and (max-width: 1100px) {
      .aw-table th.c-life, .aw-table td.c-life, .aw-table th.c-bk, .aw-table td.c-bk { display: none; }
    }
  `],
})
export class AdminPortalCrmListComponent {
  private _data: Record<string, unknown> = {};
  @Input() set data(v: Record<string, unknown>) {
    this._data = v || {};
    this.local = null;          // a shell re-resolve wins; drop the stale local copy
    this.seedParams(this._data);
  }
  get data(): Record<string, unknown> { return this._data; }
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
  @Output() bulkSuspend = new EventEmitter<{ type: 'customers' | 'providers'; ids: number[] }>();

  /**
   * Local stale-while-revalidate copy. Filter changes update this in place via
   * a quiet BFF refetch — NO router navigation, so the shell never re-mounts
   * and the screen never flickers. Mirrors the RN CRM (`crm/index.tsx`), whose
   * comment notes that navigating per filter "flashed the dark Stack background".
   */
  private local: Record<string, unknown> | null = null;
  private get d(): Record<string, unknown> { return this.local ?? this._data; }

  loading = false;
  search = '';
  private currentParams: Record<string, string> = {};
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  selected = new Set<number>();

  constructor(private bff: BeautyBffService, private cdr: ChangeDetectorRef) {}

  // The shell used to bind these as @Inputs; the component now derives them
  // from the live (local-or-shell) data so a self-refetch updates them too.
  get type(): 'customers' | 'providers' { return (this.d['type'] as 'customers' | 'providers') ?? 'customers'; }
  get chipStyle(): 'pill' | 'underline' { return (this.d['chip_style'] as 'pill' | 'underline') ?? 'pill'; }
  get bulk(): boolean { return Boolean(this.d['bulk']); }
  get activeTagIds(): string[] { return (this.d['active_tag_ids'] as string[]) ?? []; }

  // ── Chrome ──
  get notifCount(): number | null { return (this.d['notif_count'] as number | null) ?? null; }
  get adminName(): string { return (this.d['first_name'] as string) || 'Maria R.'; }
  get adminEmail(): string { return (this.d['admin_email'] as string) || 'maria@beauty.io'; }
  get sessionRemaining(): string { return (this.d['session_remaining'] as string) ?? '14:32'; }
  get sidebarActive(): AdminWebNav { return this.type === 'providers' ? 'crm-providers' : 'crm-customers'; }
  get navBadges(): Record<string, number> {
    const badges = (this.d['tab_badges'] as Record<string, number | null>) ?? {};
    const out: Record<string, number> = {};
    if (badges['tickets']) out['tickets'] = badges['tickets'] as number;
    return out;
  }

  get tabs(): AdminWebTab[] {
    return [
      { id: 'customers', label: 'Customers', count: this.counts.customers },
      { id: 'providers', label: 'Business providers', count: this.counts.providers },
    ];
  }
  get headerSub(): string {
    return this.type === 'providers'
      ? `${this.fmt(this.counts.providers)} registered businesses`
      : `${this.fmt(this.counts.customers)} customers`;
  }

  // ── Data ──
  get activeStatus(): StatusBucket['id'] { return ((this.d['active_status'] as StatusBucket['id']) ?? 'All'); }
  get queryValue(): string { return (this.d['q'] as string) ?? ''; }
  isAdvancedActive(key: string): boolean { return Boolean(this.d[key]); }

  readonly advancedFilters: { key: string; label: string }[] = [
    { key: 'signup_30d', label: 'Sign-up: 30d' },
    { key: 'active_7d',  label: 'Active: 7d' },
    { key: 'spend_high', label: 'Spend: High' },
    { key: 'has_bk',     label: 'Has bookings' },
  ];
  private readonly advancedKeys = ['signup_30d', 'active_7d', 'spend_high', 'has_bk'];

  get rows(): CrmRow[] { return (this.d['rows'] as CrmRow[]) ?? []; }
  get counts(): { customers: number; providers: number } {
    return (this.d['counts'] as { customers: number; providers: number }) ?? { customers: 0, providers: 0 };
  }
  get filteredTotal(): number {
    const v = this.d['filtered_total'];
    if (typeof v === 'number') return v;
    return this.type === 'customers' ? this.counts.customers : this.counts.providers;
  }
  get statusBuckets(): StatusBucket[] {
    const total = this.filteredTotal;
    return (this.d['status_buckets'] as StatusBucket[]) ?? [
      { id: 'All', count: total }, { id: 'Active', count: total },
      { id: 'Pending', count: 0 }, { id: 'Suspended', count: 0 },
      { id: 'Flagged', count: 0 }, { id: 'Deleted', count: 0 },
    ];
  }
  /** Real tags from the resolver (falls back to empty). */
  get tagList(): CrmTag[] { return (this.d['tags'] as CrmTag[]) ?? []; }

  fmt(n: number): string { return (n ?? 0).toLocaleString(); }
  idLabel(r: CrmRow): string { return `${this.type === 'providers' ? 'prov' : 'cust'}_${r.id}`; }

  statusClass(s: string): string {
    const map: Record<string, string> = {
      Active: 's-green', Verified: 's-green',
      Suspended: 's-red', Cancelled: 's-red', AtRisk: 's-red',
      Pending: 's-amber', Flagged: 's-amber',
      Deleted: 's-grey', VIP: 's-gold',
    };
    return map[s] || 's-grey';
  }

  toggleSel(id: number): void { if (this.selected.has(id)) this.selected.delete(id); else this.selected.add(id); }
  clearSel(): void { this.selected.clear(); }

  // ── Filter state: local params + quiet refetch (no navigation) ──

  /** Seed local filter params + search box from a freshly shell-resolved envelope. */
  private seedParams(d: Record<string, unknown>): void {
    const p: Record<string, string> = {};
    p['type'] = (d['type'] as string) || 'customers';
    if ((d['chip_style'] as string) === 'underline') p['chip'] = 'underline';
    if (d['bulk']) p['bulk'] = '1';
    const status = (d['active_status'] as string) || 'All';
    if (status !== 'All') p['status'] = status.toLowerCase();
    const tags = (d['active_tag_ids'] as string[]) || [];
    if (tags.length) p['tag'] = tags[0];
    if (d['q']) p['q'] = d['q'] as string;
    for (const k of this.advancedKeys) { if (d[k]) p[k] = '1'; }
    this.currentParams = p;
    this.search = (d['q'] as string) || '';
  }

  /** Merge `extra` into the params and quietly refetch in place. */
  private navWith(extra: Record<string, string | null>): void {
    const next: Record<string, string> = { ...this.currentParams };
    for (const [k, v] of Object.entries(extra)) { if (v === null || v === '') delete next[k]; else next[k] = v; }
    this.currentParams = next;
    this.refetch();
  }

  /** Stale-while-revalidate: keep current rows visible, fetch, swap in place. */
  private refetch(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.bff.resolve('beauty_admin_portal_crm', this.currentParams).subscribe({
      next: (resp) => {
        if (resp && resp.action === 'render' && resp.data) {
          this.local = resp.data as Record<string, unknown>;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  onStatus(id: StatusBucket['id']): void { this.navWith({ status: id === 'All' ? null : id.toLowerCase() }); }
  onTag(id: string): void { this.navWith({ tag: this.activeTagIds.includes(id) ? null : id }); }
  toggleAdvanced(f: { key: string }): void {
    this.navWith({ [f.key]: this.isAdvancedActive(f.key) ? null : '1' });
  }

  /** Live, debounced search — fires ~250ms after the user stops typing. */
  onSearchInput(value: string): void {
    this.search = value;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      const v = (this.search || '').trim();
      if (v !== this.queryValue) this.navWith({ q: v || null });
    }, 250);
  }
  /** Enter → submit immediately (skip the debounce). */
  onSearchSubmit(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    const v = (this.search || '').trim();
    if (v === this.queryValue) return;
    this.navWith({ q: v || null });
  }
  clearSearch(): void {
    this.search = '';
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.navWith({ q: null });
  }

  onBulkTag(): void { const link = this.links['manage_tags']; if (link) this.followLink.emit(link); }

  /**
   * Bulk suspend → open the single-target suspend confirm modal (audited
   * reason + focus-trap) for the first selected row. Mirrors RN: there is no
   * batch endpoint, and silently suspending without the reason modal would
   * violate the destructive-action contract.
   */
  onBulkSuspend(): void {
    const firstId = Array.from(this.selected)[0];
    if (firstId == null) return;
    const kind = this.type === 'customers' ? 'customer' : 'business';
    this.followLink.emit({
      rel: 'suspend_confirm', href: null, method: 'NAV',
      screen: 'beauty_admin_portal_suspend',
      route: `/pogoda/beauty/admin/portal/crm/suspend/${kind}/${firstId}`,
      prompt: null, params: { type: kind, id: firstId },
    });
  }

  onType(t: 'customers' | 'providers'): void {
    if (t === this.type) return;
    this.selected.clear();
    this.navWith({ type: t });
  }
  onManage(): void { const link = this.links['manage_tags']; if (link) this.followLink.emit(link); }

  openDetail(r: CrmRow): void {
    const link = this.links[this.type === 'customers' ? 'customer_detail' : 'provider_detail'];
    if (!link) return;
    this.followLink.emit({ ...link, route: (link.route ?? '').replace(':id', String(r.id)), params: { id: r.id } });
  }

  openSuspend(r: CrmRow): void {
    const kind = this.type === 'customers' ? 'customer' : 'business';
    this.followLink.emit({
      rel: 'suspend_confirm', href: null, method: 'NAV',
      screen: 'beauty_admin_portal_suspend',
      route: `/pogoda/beauty/admin/portal/crm/suspend/${kind}/${r.id}`,
      prompt: null, params: { type: kind, id: r.id },
    });
  }
}
