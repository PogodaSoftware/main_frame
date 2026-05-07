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
 * Visual styling follows the existing flags admin screen so the two
 * surfaces feel like one product.
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
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="crm-page">
      <header class="crm-header">
        <div class="crm-brand">
          <button class="brand-name-btn" (click)="emit(links['home'])">Beauty</button>
          <span class="crm-subtitle">CRM</span>
        </div>
        <div class="crm-admin-badge" *ngIf="adminEmail">{{ adminEmail }}</div>
      </header>

      <main id="main" class="crm-main">
        <span class="sr-only" role="status" aria-live="polite">{{ announcement }}</span>

        <section class="crm-intro">
          <h1>Customer relationship management</h1>
          <p>
            Search, filter, and suspend customer or business-provider
            accounts. Suspending an account immediately invalidates every
            active session and blocks future sign-ins until reinstated.
          </p>
        </section>

        <section class="crm-controls" aria-label="Search and filter">
          <form class="crm-search" (submit)="onSearch($event)">
            <label class="sr-only" for="crm-q">Search accounts</label>
            <input
              id="crm-q"
              data-testid="crm-search-input"
              type="search"
              autocomplete="off"
              placeholder="Search by email or business name"
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
        </section>

        <p
          *ngIf="error"
          class="crm-error"
          role="alert"
          data-testid="crm-error"
        >{{ error }}</p>

        <section class="crm-list" aria-label="Accounts">
          <div *ngIf="loading" class="crm-loading" data-testid="crm-loading">Loading…</div>

          <article
            *ngFor="let row of items; trackBy: trackByRow"
            class="crm-card"
            [attr.data-testid]="'crm-row-' + row.type + '-' + row.id"
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
                [class.is-neutral]="row.is_suspended"
                [disabled]="busyKey === rowKey(row)"
                [attr.data-testid]="(row.is_suspended ? 'crm-reinstate-' : 'crm-suspend-') + row.type + '-' + row.id"
                (click)="onSuspend(row)"
              >
                {{ row.is_suspended ? 'Reinstate' : 'Suspend' }}
              </button>
            </div>
          </article>

          <p
            *ngIf="!loading && !items.length"
            class="crm-empty"
            data-testid="crm-empty"
          >No accounts match the current filters.</p>
        </section>

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
    :host { display: block; min-height: 100dvh; background: #f7f7f8; color: #1c1c1e;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .crm-page { max-width: 960px; margin: 0 auto; padding: 24px 20px 64px; }
    .crm-header { display: flex; justify-content: space-between; align-items: center;
      padding-bottom: 16px; border-bottom: 1px solid #e5e5ea; margin-bottom: 24px; }
    .crm-brand { display: flex; align-items: baseline; gap: 12px; }
    .brand-name-btn { background: none; border: none; padding: 0; cursor: pointer;
      font-size: 1.5rem; font-weight: 700; color: #1c1c1e; }
    .crm-subtitle { color: #6b6b70; font-size: 0.95rem; }
    .crm-admin-badge { font-size: 0.85rem; padding: 6px 12px; border-radius: 999px;
      background: #1c1c1e; color: #fff; }
    .crm-intro h1 { margin: 0 0 8px; font-size: 1.6rem; }
    .crm-intro p { margin: 0 0 20px; color: #5b5b60; line-height: 1.4; }

    .crm-controls { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; }
    .crm-search { display: flex; gap: 8px; }
    .crm-search input { flex: 1; min-height: 44px; padding: 10px 14px;
      border: 1px solid #d6d6db; border-radius: 10px; font-size: 0.95rem; background: #fff; }
    .crm-search-btn { min-height: 44px; padding: 0 18px; border-radius: 10px;
      background: #1c1c1e; color: #fff; border: none; cursor: pointer; font-weight: 600; }
    .crm-search-btn:hover { background: #2a2a2c; }
    .crm-tabs { display: inline-flex; gap: 4px; background: #ececef;
      padding: 4px; border-radius: 12px; align-self: flex-start; flex-wrap: wrap; }
    .crm-tab { background: transparent; border: none; padding: 8px 14px; min-height: 36px;
      border-radius: 8px; cursor: pointer; color: #4a4a4f; font-weight: 500; }
    .crm-tab:hover { color: #1c1c1e; }
    .crm-tab.is-active { background: #fff; color: #1c1c1e; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

    .crm-error { color: #94343b; background: #fbe9eb; border: 1px solid #f1c5c9;
      border-radius: 10px; padding: 10px 14px; margin: 0 0 16px; font-size: 0.9rem; }
    .crm-loading { color: #6b6b70; font-style: italic; padding: 12px 0; }

    .crm-list { display: grid; gap: 12px; margin-bottom: 24px; }
    .crm-card { display: flex; justify-content: space-between; gap: 16px;
      background: #fff; border: 1px solid #e5e5ea; border-radius: 12px; padding: 16px 18px; }
    .crm-card.is-suspended { background: #fdf3f4; border-color: #f1c5c9; }
    .crm-card-info { flex: 1; min-width: 0; }
    .crm-row-top { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
    .crm-type { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em;
      padding: 2px 8px; border-radius: 999px; font-weight: 600; }
    .crm-type--customer { background: #e3f0fc; color: #1d4ed8; }
    .crm-type--business { background: #ecf6e7; color: #166534; }
    .crm-status { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em;
      padding: 2px 8px; border-radius: 999px; font-weight: 600;
      background: #fbe9eb; color: #94343b; }
    .crm-name { margin: 0 0 4px; font-size: 1.05rem; font-weight: 600;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .crm-email { display: inline-block; font-size: 0.78rem; color: #6b6b70;
      background: #f1f1f3; padding: 2px 6px; border-radius: 6px; }
    .crm-meta { margin: 8px 0 0; color: #6b6b70; font-size: 0.82rem; }

    .crm-card-actions { display: flex; align-items: center; }
    .crm-action { min-height: 44px; padding: 0 16px; border-radius: 10px;
      cursor: pointer; font-weight: 600; border: 1px solid transparent; font-family: inherit; }
    .crm-action.is-danger { background: #c0392b; color: #fff; border-color: #c0392b; }
    .crm-action.is-danger:hover:not(:disabled) { background: #9f2f23; border-color: #9f2f23; }
    .crm-action.is-neutral { background: #fff; color: #1c1c1e; border-color: #1c1c1e; }
    .crm-action.is-neutral:hover:not(:disabled) { background: #f1f1f3; }
    .crm-action:disabled { opacity: 0.55; cursor: progress; }

    .crm-pagination { display: flex; justify-content: space-between; align-items: center;
      gap: 12px; padding: 12px 0; border-top: 1px solid #e5e5ea; flex-wrap: wrap; }
    .crm-page-btn { min-height: 44px; padding: 0 16px; border-radius: 10px;
      background: #fff; color: #1c1c1e; border: 1px solid #d6d6db; cursor: pointer; font-weight: 500; }
    .crm-page-btn:hover:not(:disabled) { background: #f1f1f3; }
    .crm-page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .crm-page-info { color: #5b5b60; font-size: 0.9rem; }

    .crm-empty { color: #6b6b70; font-style: italic; padding: 12px 0; }

    .sr-only { position: absolute !important; width: 1px !important; height: 1px !important;
      padding: 0 !important; margin: -1px !important; overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }

    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    @media (min-width: 720px) {
      .crm-controls { flex-direction: row; align-items: center; justify-content: space-between; }
      .crm-search { flex: 1; max-width: 460px; }
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
