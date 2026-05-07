/**
 * BeautyAdminCrmComponent (Presentational)
 * ----------------------------------------
 * Admin CRM directory for the Beauty product. Renders a unified list of
 * customer + business-provider accounts with:
 *
 *   - search bar (matches email + business name)
 *   - filter tabs (All / Customers / Businesses)
 *   - server-side pagination
 *   - per-row Suspend / Reinstate action
 *
 * Visual styling follows the existing customer / business-provider mobile-app
 * shell so all admin surfaces share one coherent design language.
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { BeautyProviderSubHeaderComponent } from './provider/prov-sub-header.component';
import { BeautyProviderCardComponent } from './provider/prov-card.component';

interface CrmRow {
  id: number;
  type: 'customer' | 'business';
  email: string;
  name: string;
  created_at: string;
  is_suspended: boolean;
  suspended_at: string | null;
}

interface CrmListResponse {
  items: CrmRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  filters: { type: 'all' | 'customer' | 'business'; q: string };
}

type CrmTab = 'all' | 'customer' | 'business';

@Component({
  selector: 'app-beauty-admin-crm',
  standalone: true,
  imports: [CommonModule, FormsModule, BeautyProviderSubHeaderComponent, BeautyProviderCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="beauty-app prov-shell" data-testid="crm-page">
      <app-prov-sub-header
        back="Home"
        title="CRM"
        (backClick)="emit(links['home'])"
      >
        <div slot="right" class="admin-header-right">
          <button
            *ngIf="links['flags']"
            type="button"
            class="admin-nav-btn"
            data-testid="crm-nav-flags"
            (click)="emit(links['flags'])"
          >Feature flags</button>
          <span class="admin-badge" *ngIf="adminEmail" data-testid="crm-admin-badge">{{ adminEmail }}</span>
        </div>
      </app-prov-sub-header>

      <main id="main" class="prov-body crm-body">
        <span class="sr-only" role="status" aria-live="polite">{{ announcement }}</span>

        <section class="crm-intro">
          <p class="crm-intro-text">
            Search, filter, and manage customer or business-provider accounts.
            Suspending an account immediately invalidates every active session
            and blocks sign-in until reinstated.
          </p>
        </section>

        <!-- Search + Filter controls -->
        <app-prov-card padding="0">
          <div class="crm-controls" aria-label="Search and filter">
            <form class="crm-search-row" (submit)="onSearch($event)">
              <label class="sr-only" for="crm-q">Search accounts</label>
              <input
                id="crm-q"
                data-testid="crm-search-input"
                class="crm-search-input"
                type="search"
                autocomplete="off"
                placeholder="Search by email or business name…"
                [(ngModel)]="query"
                name="query"
              />
              <button
                type="submit"
                class="crm-search-btn"
                data-testid="crm-search-submit"
              >Search</button>
            </form>

            <div class="crm-tabs" role="tablist" aria-label="Filter accounts">
              <button
                role="tab"
                type="button"
                class="crm-tab"
                data-testid="crm-tab-all"
                [class.is-active]="tab === 'all'"
                [attr.aria-selected]="tab === 'all'"
                (click)="setTab('all')"
              >All</button>
              <button
                role="tab"
                type="button"
                class="crm-tab"
                data-testid="crm-tab-customer"
                [class.is-active]="tab === 'customer'"
                [attr.aria-selected]="tab === 'customer'"
                (click)="setTab('customer')"
              >Customers</button>
              <button
                role="tab"
                type="button"
                class="crm-tab"
                data-testid="crm-tab-business"
                [class.is-active]="tab === 'business'"
                [attr.aria-selected]="tab === 'business'"
                (click)="setTab('business')"
              >Businesses</button>
            </div>
          </div>
        </app-prov-card>

        <!-- Error banner -->
        <p
          *ngIf="error"
          class="crm-error"
          role="alert"
          data-testid="crm-error"
        >{{ error }}</p>

        <!-- Account list -->
        <section class="crm-list" aria-label="Accounts">
          <div *ngIf="loading" class="crm-loading" data-testid="crm-loading">Loading…</div>

          <app-prov-card
            *ngFor="let row of items; trackBy: trackByRow"
            padding="0"
            [attr.data-testid]="'crm-row-' + row.type + '-' + row.id"
          >
            <article
              class="crm-card"
              [class.is-suspended]="row.is_suspended"
            >
              <div class="crm-card-info">
                <div class="crm-row-top">
                  <span
                    class="crm-type"
                    [class.crm-type--customer]="row.type === 'customer'"
                    [class.crm-type--business]="row.type === 'business'"
                  >{{ row.type === 'business' ? 'Business' : 'Customer' }}</span>
                  <span class="crm-status" *ngIf="row.is_suspended" data-testid="crm-row-suspended">Suspended</span>
                </div>
                <h2 class="crm-name">{{ row.name || row.email }}</h2>
                <code class="crm-email">{{ row.email }}</code>
                <p class="crm-meta">Joined {{ formatDate(row.created_at) }}</p>
              </div>
              <div class="crm-card-actions">
                <button
                  type="button"
                  class="crm-action"
                  [class.is-danger]="!row.is_suspended"
                  [class.is-reinstate]="row.is_suspended"
                  [disabled]="busyKey === rowKey(row)"
                  [attr.data-testid]="(row.is_suspended ? 'crm-reinstate-' : 'crm-suspend-') + row.type + '-' + row.id"
                  (click)="onSuspend(row)"
                >
                  {{ row.is_suspended ? 'Reinstate' : 'Suspend' }}
                </button>
              </div>
            </article>
          </app-prov-card>

          <p
            *ngIf="!loading && !items.length"
            class="crm-empty"
            data-testid="crm-empty"
          >No accounts match the current filters.</p>
        </section>

        <!-- Pagination -->
        <nav class="crm-pagination" aria-label="Pagination" *ngIf="totalPages > 1">
          <button
            type="button"
            class="crm-page-btn"
            data-testid="crm-prev"
            [disabled]="page <= 1 || loading"
            (click)="goToPage(page - 1)"
          >← Previous</button>
          <span class="crm-page-info" data-testid="crm-page-info">
            Page {{ page }} of {{ totalPages }} · {{ total }} {{ total === 1 ? 'account' : 'accounts' }}
          </span>
          <button
            type="button"
            class="crm-page-btn"
            data-testid="crm-next"
            [disabled]="page >= totalPages || loading"
            (click)="goToPage(page + 1)"
          >Next →</button>
        </nav>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* ── App shell (matches business-provider pages) ── */
    .beauty-app {
      display: flex; flex-direction: column;
      min-height: 100dvh;
      background: #F2F2F2;
      color: #0F1115;
    }
    .prov-body {
      flex: 1; overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    /* ── Header right slot ── */
    .admin-header-right {
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    .admin-nav-btn {
      background: transparent; border: 1px solid #DCDCDF;
      border-radius: 8px; padding: 0 12px;
      min-height: 36px; cursor: pointer;
      font-family: inherit; font-size: 13px; font-weight: 500;
      color: #0F1115;
    }
    .admin-nav-btn:hover { background: #EBEBEB; }
    .admin-badge {
      font-size: 12px; padding: 4px 10px; border-radius: 999px;
      background: #0F1115; color: #fff; white-space: nowrap;
    }

    /* ── Intro text ── */
    .crm-body { padding: 16px 14px 64px; display: flex; flex-direction: column; gap: 14px; }
    .crm-intro-text {
      margin: 0; color: #6B6F77; font-size: 13px; line-height: 1.5;
    }

    /* ── Controls card ── */
    .crm-controls {
      padding: 14px 16px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .crm-search-row { display: flex; gap: 8px; }
    .crm-search-input {
      flex: 1; min-height: 44px; padding: 10px 13px;
      border: 1px solid #DCDCDF; border-radius: 10px;
      font-size: 14px; font-family: inherit;
      background: #fff; color: #0F1115;
    }
    .crm-search-input:focus { outline: 2px solid #1a3a52; outline-offset: 1px; }
    .crm-search-btn {
      min-height: 44px; padding: 0 16px; border-radius: 10px;
      background: #0F1115; color: #fff; border: none;
      cursor: pointer; font-weight: 600; font-size: 13px; font-family: inherit;
      white-space: nowrap;
    }
    .crm-search-btn:hover { background: #2a2a2c; }

    /* ── Filter tabs (pill chip style) ── */
    .crm-tabs {
      display: inline-flex; gap: 4px;
      background: #EBEBEF; padding: 4px; border-radius: 12px;
      align-self: flex-start; flex-wrap: wrap;
    }
    .crm-tab {
      background: transparent; border: none;
      padding: 7px 14px; min-height: 36px;
      border-radius: 8px; cursor: pointer;
      color: #6B6F77; font-weight: 500; font-size: 13px; font-family: inherit;
    }
    .crm-tab:hover { color: #0F1115; }
    .crm-tab.is-active {
      background: #fff; color: #0F1115;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    /* ── Error ── */
    .crm-error {
      color: #94343b; background: #fbe9eb;
      border: 1px solid #f1c5c9; border-radius: 10px;
      padding: 10px 14px; font-size: 13px; margin: 0;
    }
    .crm-loading { color: #6B6F77; font-style: italic; padding: 12px 0; font-size: 14px; }

    /* ── Account cards ── */
    .crm-list { display: flex; flex-direction: column; gap: 10px; }
    .crm-card {
      display: flex; justify-content: space-between; gap: 14px;
      padding: 14px 16px; align-items: center;
    }
    .crm-card.is-suspended { background: #fdf3f4; border-radius: 14px; }
    .crm-card-info { flex: 1; min-width: 0; }
    .crm-row-top { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }

    .crm-type {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
      padding: 2px 8px; border-radius: 999px; font-weight: 600;
    }
    .crm-type--customer { background: #e3f0fc; color: #1d4ed8; }
    .crm-type--business { background: #ecf6e7; color: #166534; }

    .crm-status {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
      padding: 2px 8px; border-radius: 999px; font-weight: 600;
      background: #fbe9eb; color: #94343b;
    }
    .crm-name {
      margin: 0 0 4px; font-size: 15px; font-weight: 600;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      color: #0F1115;
    }
    .crm-email {
      display: inline-block; font-size: 12px; color: #6B6F77;
      background: #F2F2F2; padding: 2px 6px; border-radius: 6px;
    }
    .crm-meta { margin: 6px 0 0; color: #6B6F77; font-size: 12px; }

    /* ── Action buttons ── */
    .crm-card-actions { display: flex; align-items: center; flex-shrink: 0; }
    .crm-action {
      min-height: 44px; padding: 0 14px; border-radius: 10px;
      cursor: pointer; font-weight: 600; font-size: 13px; font-family: inherit;
      border: 1px solid transparent; white-space: nowrap;
    }
    .crm-action.is-danger { background: #C0392B; color: #fff; border-color: #C0392B; }
    .crm-action.is-danger:hover:not(:disabled) { background: #9f2f23; border-color: #9f2f23; }
    .crm-action.is-reinstate { background: #fff; color: #0F1115; border-color: #DCDCDF; }
    .crm-action.is-reinstate:hover:not(:disabled) { background: #F2F2F2; }
    .crm-action:disabled { opacity: 0.5; cursor: progress; }

    /* ── Pagination ── */
    .crm-pagination {
      display: flex; justify-content: space-between; align-items: center;
      gap: 10px; padding: 12px 0; border-top: 1px solid #DCDCDF; flex-wrap: wrap;
    }
    .crm-page-btn {
      min-height: 44px; padding: 0 16px; border-radius: 10px;
      background: #fff; color: #0F1115; border: 1px solid #DCDCDF;
      cursor: pointer; font-weight: 500; font-size: 13px; font-family: inherit;
    }
    .crm-page-btn:hover:not(:disabled) { background: #F2F2F2; }
    .crm-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .crm-page-info { color: #6B6F77; font-size: 13px; }

    .crm-empty { color: #6B6F77; font-style: italic; font-size: 14px; padding: 12px 0; }

    .sr-only {
      position: absolute !important; width: 1px !important; height: 1px !important;
      padding: 0 !important; margin: -1px !important; overflow: hidden !important;
      clip: rect(0,0,0,0) !important; white-space: nowrap !important; border: 0 !important;
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    @media (min-width: 600px) {
      .crm-controls { flex-direction: row; align-items: center; justify-content: space-between; }
      .crm-search-row { flex: 1; max-width: 420px; }
    }
  `],
})
export class BeautyAdminCrmComponent implements OnInit {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  items: CrmRow[] = [];
  total = 0;
  page = 1;
  pageSize = 10;
  totalPages = 1;
  tab: CrmTab = 'all';
  query = '';

  loading = false;
  error: string | null = null;
  busyKey: string | null = null;
  announcement = '';

  constructor(
    private auth: BeautyAuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  get adminEmail(): string {
    return (this.data['admin_email'] as string) || '';
  }

  ngOnInit(): void {
    this.fetch();
  }

  trackByRow = (_: number, row: CrmRow): string => `${row.type}:${row.id}`;
  rowKey(row: CrmRow): string { return `${row.type}:${row.id}`; }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  setTab(tab: CrmTab): void {
    if (this.tab === tab) return;
    this.tab = tab;
    this.page = 1;
    this.fetch();
  }

  onSearch(e: Event): void {
    e.preventDefault();
    this.page = 1;
    this.fetch();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.fetch();
  }

  private buildListLink(): BffLink {
    const base = (this.data['list_href'] as string) || (this.links['list']?.href ?? '/api/beauty/admin/crm/');
    const params = new URLSearchParams();
    params.set('type', this.tab);
    params.set('page', String(this.page));
    params.set('page_size', String(this.pageSize));
    if (this.query.trim()) params.set('q', this.query.trim());
    return {
      rel: 'list',
      href: `${base}?${params.toString()}`,
      method: 'GET',
      screen: null, route: null, prompt: null,
    };
  }

  private fetch(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    this.auth.follow<CrmListResponse>(this.buildListLink()).subscribe({
      next: (resp) => {
        this.loading = false;
        if (!resp) {
          this.items = []; this.total = 0; this.totalPages = 1;
        } else {
          this.items = resp.items || [];
          this.total = resp.total || 0;
          this.page = resp.page || 1;
          this.pageSize = resp.page_size || this.pageSize;
          this.totalPages = resp.total_pages || 1;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || 'Could not load accounts.';
        this.items = []; this.total = 0; this.totalPages = 1;
        this.cdr.markForCheck();
      },
    });
  }

  onSuspend(row: CrmRow): void {
    const key = this.rowKey(row);
    if (this.busyKey === key) return;
    const suspendLink = this.links['suspend'] || {
      rel: 'suspend', href: (this.data['suspend_href'] as string) || '/api/beauty/admin/crm/suspend/',
      method: 'POST' as const, screen: null, route: null, prompt: null,
    };
    if (!suspendLink.href) return;
    const next = !row.is_suspended;
    this.busyKey = key;
    this.cdr.markForCheck();
    this.auth
      .follow<{ id: number; type: string; is_suspended: boolean }>(suspendLink, {
        type: row.type, id: row.id, suspended: next,
      })
      .subscribe({
        next: () => {
          this.busyKey = null;
          row.is_suspended = next;
          this.announcement = `${row.email} ${next ? 'suspended' : 'reinstated'}.`;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.busyKey = null;
          this.error = err?.error?.detail || 'Could not update account.';
          this.cdr.markForCheck();
        },
      });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString();
  }
}
