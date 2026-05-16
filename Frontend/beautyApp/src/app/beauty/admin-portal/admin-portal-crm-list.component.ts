/**
 * AdminPortalCrmListComponent — `/admin/portal/crm`
 *
 * Handles D1 (customers), D2 (providers), D3 (tag filter), D5 (bulk),
 * D7 (underline chip variant) via input flags. Visual D6 suspend modal
 * routes to its own component; D4 tag manager too.
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
  AdmAvatarComponent,
  AdmStatusChipComponent,
  AdmFilterChipComponent,
} from './atoms';

interface CrmRow {
  id: number;
  initials: string;
  name: string;
  email: string;
  status: 'Active' | 'Suspended' | 'Pending' | 'Deleted' | 'Flagged';
  tags: ('VIP' | 'Verified' | 'AtRisk')[];
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
    AdmStatusBarComponent,
    AdmHomeIndicatorComponent,
    AdmTopHeaderComponent,
    AdmTabBarComponent,
    AdmAvatarComponent,
    AdmStatusChipComponent,
    AdmFilterChipComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm-app is-light adm-crm">
      <adm-status-bar tone="slate"></adm-status-bar>
      <adm-top-header [notifCount]="notifCount"></adm-top-header>

      <div class="session" role="status">
        <span class="left">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/>
          </svg>
          Session ends in <span class="mono">14:32</span>
        </span>
        <a href="#" (click)="$event.preventDefault()">Extend</a>
      </div>

      <main class="body adm-body--scroll" role="main">

        <!-- Customer/Provider segmented tabs -->
        <div class="seg-wrap">
          <div class="seg">
            <button type="button" class="seg-tab" [class.is-on]="type === 'customers'" (click)="onType('customers')">
              Customers <span class="seg-count adm-mono">{{ fmt(counts.customers) }}</span>
            </button>
            <button type="button" class="seg-tab" [class.is-on]="type === 'providers'" (click)="onType('providers')">
              Providers <span class="seg-count adm-mono">{{ fmt(counts.providers) }}</span>
            </button>
          </div>
        </div>

        <!-- Filter row -->
        <div class="filter-row">
          <div class="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B6F77" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
            </svg>
            <input [(ngModel)]="search" name="q" placeholder="Search name, email, phone, ID, business…"
                   (keydown.enter)="onSearchSubmit()"
                   (blur)="onSearchSubmit()" />
            <button type="button" class="search-clear" *ngIf="search" (click)="clearSearch()" aria-label="Clear search">×</button>
            <span class="kbd adm-mono" *ngIf="!search">⌘K</span>
          </div>

          <div class="row-h" [class.underline-row]="chipStyle === 'underline'">
            <adm-filter-chip *ngFor="let b of statusBuckets"
                             [active]="activeStatus === b.id"
                             [count]="b.count"
                             [style]="chipStyle"
                             (press)="onStatus(b.id)">
              {{ b.id }}
            </adm-filter-chip>
          </div>

          <div class="tag-head">
            <span class="adm-eyebrow on-light">Tags</span>
            <span class="rule"></span>
            <button type="button" class="manage" (click)="onManage()">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/></svg>
              Manage
            </button>
          </div>
          <div class="row-h tag-row">
            <button *ngFor="let t of tagsFor()" type="button" class="tchip"
                    [class.is-active]="activeTagIds.includes(t.id)"
                    [style.background]="activeTagIds.includes(t.id) ? t.color : t.tone"
                    [style.color]="activeTagIds.includes(t.id) ? '#fff' : t.color"
                    [style.borderColor]="activeTagIds.includes(t.id) ? t.color : (t.color + '33')"
                    (click)="onTag(t.id)"
                    [attr.aria-pressed]="activeTagIds.includes(t.id)">
              <span class="dot" [style.background]="activeTagIds.includes(t.id) ? '#fff' : t.color"></span>
              {{ t.label }}
            </button>
            <button type="button" class="add-tag" (click)="onManage()">+ Tag</button>
          </div>

          <div class="row-h">
            <adm-filter-chip *ngFor="let f of advancedFilters"
                             [active]="f.active"
                             (press)="toggleAdvanced(f)">
              {{ f.label }}
            </adm-filter-chip>
          </div>
        </div>

        <!-- Result count + sort -->
        <div class="result-row">
          <span class="adm-mono cnt">{{ fmt(filteredTotal) }} results</span>
          <button type="button" class="sort">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
            Newest first <span class="caret">▾</span>
          </button>
        </div>

        <!-- Rows -->
        <div class="rows" [class.is-bulk]="bulk">
          <div *ngFor="let r of rows" class="row" role="link" tabindex="0"
               (click)="openDetail(r)"
               (keydown.enter)="openDetail(r)"
               (keydown.space)="openDetail(r); $event.preventDefault()"
               [attr.aria-label]="'Open ' + r.name + ' detail'">
            <input *ngIf="bulk" type="checkbox" class="bulk-cb" [checked]="selected.has(r.id)"
                   (click)="$event.stopPropagation()" (change)="toggleSel(r.id)"
                   [attr.aria-label]="'Select ' + r.name" />
            <adm-avatar [initials]="r.initials" [size]="36" [kind]="type === 'providers' ? 'provider' : 'customer'"></adm-avatar>
            <div class="ri">
              <div class="ri-h">
                <span class="ri-name">{{ r.name }}</span>
                <adm-status-chip *ngFor="let t of r.tags" [status]="$any(t)"></adm-status-chip>
              </div>
              <div class="ri-email adm-mono">{{ r.email }}</div>
              <div class="ri-meta">
                <span>{{ r.meta1 }}</span><span class="sep">·</span>
                <span>{{ r.meta2 }}</span><span class="sep">·</span>
                <span>{{ r.meta3 }}</span>
              </div>
            </div>
            <div class="ri-right">
              <adm-status-chip [status]="$any(r.status)"></adm-status-chip>
              <div class="ri-life adm-mono">{{ r.lifetime }}</div>
            </div>
            <button type="button" class="kebab" (click)="openSuspend(r); $event.stopPropagation()" [attr.aria-label]="(r.status === 'Suspended' ? 'Reinstate ' : 'Suspend ') + r.name">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
            </button>
          </div>
        </div>

        <div class="loader" *ngIf="filteredTotal > rows.length">
          <span class="spinner"></span>
          Loading more · <span class="adm-mono">{{ fmt(filteredTotal - rows.length) }} left</span>
        </div>
      </main>

      <!-- Bulk action bar (floats above tab bar when bulk=true) -->
      <div class="bulk-bar" *ngIf="bulk && selected.size > 0">
        <span class="bb-count">{{ selected.size }} selected</span>
        <span class="grow"></span>
        <button type="button" class="bb-btn" (click)="onBulkTag()">Tag</button>
        <button type="button" class="bb-btn" (click)="onBulkMessage()">Message</button>
        <button type="button" class="bb-btn is-danger" (click)="onBulkSuspend()">Suspend</button>
      </div>

      <adm-tab-bar active="crm" [badges]="tabBadges" (select)="onTab($event)"></adm-tab-bar>
      <adm-home-indicator tone="slate"></adm-home-indicator>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100dvh; background: var(--surface); }
    .adm-crm { min-height: 100dvh; }

    .session { display: flex; align-items: center; justify-content: space-between; background: #FFF4DA; border-bottom: 1px solid rgba(165,122,31,0.18); padding: 6px 14px; font-size: 11px; color: #8A6A1F; flex-shrink: 0; }
    .session .left { display: inline-flex; align-items: center; gap: 6px; }
    .session .mono { font-family: var(--adm-font-mono); font-weight: 700; }
    .session a { color: #8A6A1F; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; }

    .seg-wrap { padding: 10px 14px 0; background: var(--surface); border-bottom: 1px solid var(--line); }
    .seg { display: flex; gap: 4px; padding: 4px; background: var(--surface-2); border-radius: 12px; margin-bottom: 10px; }
    .seg-tab { flex: 1; height: 34px; border: none; cursor: pointer; border-radius: 9px; background: transparent; color: var(--text-muted); font-family: var(--adm-font-body); font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
    .seg-tab.is-on { background: #fff; color: var(--text); font-weight: 600; box-shadow: 0 1px 3px rgba(15,17,21,0.10); }
    .seg-count { font-size: 10px; font-weight: 600; color: var(--text-muted); background: var(--surface); padding: 1px 5px; border-radius: 999px; line-height: 1.2; }
    .seg-tab.is-on .seg-count { background: var(--surface); }

    .filter-row { background: var(--surface); border-bottom: 1px solid var(--line); padding: 0 14px 10px; }
    .search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--line); border-radius: 10px; height: 40px; padding: 0 12px; margin-bottom: 10px; }
    .search input { flex: 1; border: none; outline: none; background: transparent; font-family: var(--adm-font-body); font-size: 13px; color: var(--text); }
    .search input::placeholder { color: var(--text-muted); }
    .kbd { padding: 2px 5px; border-radius: 4px; background: var(--surface); color: var(--text-muted); font-size: 10px; }
    .search-clear { background: var(--surface); border: 1px solid var(--line); border-radius: 999px; width: 20px; height: 20px; color: var(--text-muted); cursor: pointer; font-size: 14px; line-height: 1; display: grid; place-items: center; padding: 0; }

    .row-h { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; padding-bottom: 2px; }
    .row-h.underline-row { gap: 12px; padding-bottom: 0; }
    .tag-row { gap: 6px; }

    .tag-head { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; padding-top: 2px; }
    .tag-head .adm-eyebrow { flex-shrink: 0; }
    .tag-head .rule { flex: 1; height: 1px; background: var(--line); }
    .manage { height: 22px; padding: 0 8px; border-radius: 6px; background: #fff; border: 1px solid var(--line); font-family: var(--adm-font-body); font-size: 10px; font-weight: 600; color: var(--text); cursor: pointer; flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px; }

    .tchip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; border: 1px solid; font-family: var(--adm-font-body); font-size: 11px; font-weight: 600; line-height: 1.2; white-space: nowrap; flex-shrink: 0; }
    .tchip .dot { width: 6px; height: 6px; border-radius: 50%; }
    .add-tag { padding: 4px 9px; border-radius: 999px; background: #fff; border: 1px dashed var(--line); font-family: var(--adm-font-body); font-size: 11px; color: var(--text-muted); cursor: pointer; flex-shrink: 0; }

    .result-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #ECECEE; background: #fff; }
    .result-row .cnt { font-size: 11px; color: var(--text-muted); }
    .sort { border: none; background: transparent; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-family: var(--adm-font-body); font-size: 11.5px; color: var(--text); font-weight: 600; }
    .sort .caret { font-size: 9px; opacity: 0.6; }

    .rows { background: #fff; }
    .rows .row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid #ECECEE; cursor: pointer; }
    .rows .row:hover { background: var(--surface); }
    .ri { flex: 1; min-width: 0; }
    .ri-h { display: flex; align-items: center; gap: 6px; }
    .ri-name { font-family: var(--adm-font-body); font-size: 13.5px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ri-email { font-size: 10.5px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ri-meta { display: flex; gap: 10px; margin-top: 4px; font-size: 10.5px; color: var(--text-muted); }
    .ri-meta .sep { opacity: 0.4; }
    .ri-right { text-align: right; flex-shrink: 0; }
    .ri-life { font-size: 10px; color: var(--text-muted); margin-top: 4px; }
    .kebab { width: 28px; height: 28px; border: none; background: transparent; cursor: pointer; display: grid; place-items: center; color: var(--text-muted); }

    .bulk-cb { width: 18px; height: 18px; accent-color: #0F1115; }

    .loader { padding: 16px 14px 24px; text-align: center; background: #fff; font-family: var(--adm-font-body); font-size: 11px; color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 8px; }
    .spinner { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--text); display: inline-block; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .bulk-bar { position: fixed; left: 12px; right: 12px; bottom: calc(64px + env(safe-area-inset-bottom) + 14px); background: #0F1115; color: #fff; border-radius: 14px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; box-shadow: 0 12px 32px rgba(15,17,21,0.35); }
    .bulk-bar .bb-count { font-size: 12px; font-weight: 600; }
    .bulk-bar .grow { flex: 1; }
    .bb-btn { height: 30px; padding: 0 10px; border-radius: 8px; background: rgba(255,255,255,0.10); color: #fff; border: none; font-family: inherit; font-size: 11px; font-weight: 600; cursor: pointer; }
    .bb-btn.is-danger { background: var(--adm-red); font-weight: 700; }

    @media screen and (min-width: 768px) {
      .bulk-bar { max-width: 406px; margin: 0 auto; left: 0; right: 0; }
    }
  `],
})
export class AdminPortalCrmListComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Input() type: 'customers' | 'providers' = 'customers';
  @Input() chipStyle: 'pill' | 'underline' = 'pill';
  @Input() bulk = false;
  @Input() activeTagIds: string[] = [];
  @Output() followLink = new EventEmitter<BffLink>();
  @Output() bulkSuspend = new EventEmitter<{ type: 'customers' | 'providers'; ids: number[] }>();

  search = '';
  private lastDataQ = '';
  selected = new Set<number>();

  get activeStatus(): StatusBucket['id'] {
    return ((this.data['active_status'] as StatusBucket['id']) ?? 'All');
  }

  get queryValue(): string { return (this.data['q'] as string) ?? ''; }
  isAdvancedActive(key: string): boolean { return Boolean(this.data[key]); }

  ngDoCheck(): void {
    // Sync the search box with the resolver-supplied `q` value any time the
    // resolver re-runs (back/forward, manual URL edit, or our own navigate).
    const incoming = this.queryValue;
    if (incoming !== this.lastDataQ) {
      this.lastDataQ = incoming;
      this.search = incoming;
    }
    // Sync each backend-wired advanced filter's active flag from data.
    for (const f of this.advancedFilters) {
      const want = this.isAdvancedActive(f.key);
      if (f.active !== want) f.active = want;
    }
  }
  advancedFilters: { key: string; label: string; active: boolean }[] = [
    { key: 'signup_30d', label: 'Sign-up: Last 30d', active: false },
    { key: 'active_7d',  label: 'Last active: 7d',   active: false },
    { key: 'spend_high', label: 'Spend: High',       active: false },
    { key: 'has_bk',     label: 'Has bookings',      active: false },
  ];

  private readonly advancedKeys = ['signup_30d', 'active_7d', 'spend_high', 'has_bk'];

  get rows(): CrmRow[] { return (this.data['rows'] as CrmRow[]) ?? []; }
  get counts(): { customers: number; providers: number } {
    return (this.data['counts'] as { customers: number; providers: number }) ?? { customers: 0, providers: 0 };
  }
  get filteredTotal(): number {
    const v = this.data['filtered_total'];
    if (typeof v === 'number') return v;
    return this.type === 'customers' ? this.counts.customers : this.counts.providers;
  }
  get statusBuckets(): StatusBucket[] {
    const total = this.filteredTotal;
    return (this.data['status_buckets'] as StatusBucket[]) ?? [
      { id: 'All',       count: total },
      { id: 'Active',    count: total },
      { id: 'Pending',   count: 0 },
      { id: 'Suspended', count: 0 },
      { id: 'Flagged',   count: 0 },
      { id: 'Deleted',   count: 0 },
    ];
  }

  readonly tags: CrmTag[] = [
    { id: 'vip',        label: 'VIP',          color: '#A06B2C', tone: '#F4E7D6', count: 184  },
    { id: 'verified',   label: 'Verified',     color: '#2F7A47', tone: '#E5F3EA', count: 9620 },
    { id: 'at-risk',    label: 'At-risk',      color: '#C0392B', tone: '#FCE8E5', count: 38   },
    { id: 'press',      label: 'Press / PR',   color: '#0F1115', tone: '#E9E9EB', count: 12   },
    { id: 'investor',   label: 'Investor',     color: '#5C4A8A', tone: '#ECE6F5', count: 6    },
    { id: 'featured',   label: 'Featured',     color: '#7DA8CF', tone: '#E6F0FA', count: 24   },
    { id: 'beta',       label: 'Beta program', color: '#1F6E7A', tone: '#DCEEF1', count: 88   },
    { id: 'win-back',   label: 'Win-back',     color: '#8A6A1F', tone: '#F1E8DA', count: 410  },
    { id: 'chargeback', label: 'Chargeback',   color: '#C0392B', tone: '#FCE8E5', count: 17   },
  ];

  tagsFor(): CrmTag[] { return this.tags; }

  fmt(n: number): string { return n.toLocaleString(); }

  toggleSel(id: number): void {
    if (this.selected.has(id)) this.selected.delete(id); else this.selected.add(id);
  }

  /** Build a query string from current filter state + override `extra`. */
  private buildQuery(extra: Record<string, string | null>): string {
    const cur: Record<string, string> = { type: this.type };
    if (this.chipStyle === 'underline') cur['chip'] = 'underline';
    if (this.bulk) cur['bulk'] = '1';
    if (this.activeStatus !== 'All') cur['status'] = this.activeStatus.toLowerCase();
    if (this.activeTagIds.length) cur['tag'] = this.activeTagIds[0];
    if (this.queryValue) cur['q'] = this.queryValue;
    for (const k of this.advancedKeys) {
      if (this.isAdvancedActive(k)) cur[k] = '1';
    }
    for (const [k, v] of Object.entries(extra)) {
      if (v === null) delete cur[k];
      else cur[k] = v;
    }
    return new URLSearchParams(cur).toString();
  }

  private navWith(extra: Record<string, string | null>): void {
    const link: BffLink = {
      rel: 'filter', href: null, method: 'NAV',
      screen: 'beauty_admin_portal_crm',
      route: '/pogoda/beauty/admin/portal/crm?' + this.buildQuery(extra),
      prompt: null,
    };
    this.followLink.emit(link);
  }

  onStatus(id: StatusBucket['id']): void {
    this.navWith({ status: id === 'All' ? null : id.toLowerCase() });
  }

  onTag(id: string): void {
    const next = this.activeTagIds.includes(id) ? null : id;
    this.navWith({ tag: next });
  }

  toggleAdvanced(f: { key: string; active: boolean }): void {
    if (this.advancedKeys.includes(f.key)) {
      const next = !f.active;
      this.navWith({ [f.key]: next ? '1' : null });
      return;
    }
    // visual-only fallback for keys without backend wiring yet.
    f.active = !f.active;
  }

  onSearchSubmit(): void {
    const v = (this.search || '').trim();
    if (v === this.queryValue) return;
    this.navWith({ q: v || null });
  }

  clearSearch(): void {
    this.search = '';
    this.onSearchSubmit();
  }

  onBulkTag(): void {
    // Open tag manager. Apply-to-selection wiring lands with assignment model.
    const link = this.links['manage_tags'];
    if (link) this.followLink.emit(link);
  }

  onBulkMessage(): void {
    // Placeholder — broadcast composer ships with the in-app messaging slice.
    alert('Bulk message composer coming with messaging slice. ' + this.selected.size + ' recipients staged.');
  }

  onBulkSuspend(): void {
    if (!this.selected.size) return;
    this.bulkSuspend.emit({ type: this.type, ids: Array.from(this.selected) });
  }

  onType(t: 'customers' | 'providers'): void {
    if (t === this.type) return;
    const link = this.links[t === 'customers' ? 'customers' : 'providers'];
    if (link) this.followLink.emit(link);
  }

  onManage(): void {
    const link = this.links['manage_tags'];
    if (link) this.followLink.emit(link);
  }

  openDetail(r: CrmRow): void {
    const link = this.links[this.type === 'customers' ? 'customer_detail' : 'provider_detail'];
    if (!link) return;
    this.followLink.emit({ ...link, route: (link.route ?? '').replace(':id', String(r.id)), params: { id: r.id } });
  }

  openSuspend(r: CrmRow): void {
    const kind = this.type === 'customers' ? 'customer' : 'business';
    const link: BffLink = {
      rel: 'suspend_confirm', href: null, method: 'NAV',
      screen: 'beauty_admin_portal_suspend',
      route: `/pogoda/beauty/admin/portal/crm/suspend/${kind}/${r.id}`,
      prompt: null,
      params: { type: kind, id: r.id },
    };
    this.followLink.emit(link);
  }

  onTab(kind: string): void {
    const link = this.links[kind === 'crm' ? 'self' : kind];
    if (link) this.followLink.emit(link);
  }

  get tabBadges(): Record<string, number | string | null> {
    return (this.data['tab_badges'] as Record<string, number | string | null>) ?? {};
  }
}
