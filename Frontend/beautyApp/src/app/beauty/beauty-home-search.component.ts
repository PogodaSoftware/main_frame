/**
 * BeautyHomeSearchComponent
 * -------------------------
 * Search bar that lives above the home-page carousel. Reuses the
 * `/api/beauty/services/search/` endpoint that powers the standalone
 * search page. Auto-applies the customer's stored location so results
 * arrive ordered by proximity. Each result navigates to the existing
 * service-detail/booking screen at `/book/:serviceId`, leaving the
 * downstream booking flow untouched.
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { BeautySearchService, SearchItem } from './beauty-search.service';

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

@Component({
  selector: 'app-beauty-home-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <section class="home-search" data-testid="home-search">
      <label class="sr-only" for="home-search-input">Search services</label>
      <div class="home-search-box">
        <svg class="home-search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input
          id="home-search-input"
          class="home-search-input"
          type="search"
          autocomplete="off"
          placeholder="Search services..."
          aria-label="Search services"
          data-testid="home-search-input"
          [(ngModel)]="query"
          (ngModelChange)="onQueryChange($event)"
        />
      </div>

      <div
        class="home-search-status"
        data-testid="home-search-status"
        aria-live="polite"
        role="status"
        *ngIf="hasQuery">
        <ng-container *ngIf="loading">Searching…</ng-container>
        <ng-container *ngIf="!loading && !rateLimited">
          {{ results.length }} result{{ results.length === 1 ? '' : 's' }} found
        </ng-container>
      </div>

      <div
        class="home-search-toast home-search-toast--rate"
        data-testid="home-search-rate-toast"
        role="alert"
        *ngIf="rateLimited">
        Please slow down
      </div>

      <div
        class="home-search-toast home-search-toast--error"
        data-testid="home-search-error-toast"
        role="alert"
        *ngIf="errorMessage">
        {{ errorMessage }}
      </div>

      <ul
        class="home-search-results"
        data-testid="home-search-results"
        *ngIf="hasQuery && results.length"
        role="list"
        aria-label="Search results">
        <li
          *ngFor="let s of results; trackBy: trackById"
          class="home-search-card"
          role="listitem"
          data-testid="search-result-card"
          [attr.data-service-id]="s.id"
          [attr.data-distance]="s.distance_km == null ? '' : s.distance_km"
          [attr.data-is-future]="s.is_future ? 'true' : 'false'">
          <button
            type="button"
            class="home-search-card-btn"
            (click)="openService(s)">
            <div class="home-search-card-name">{{ s.name }}</div>
            <div class="home-search-card-provider">{{ s.provider.name }}</div>
            <div class="home-search-card-meta">
              <span>{{ s.duration_minutes }} min</span>
              <span class="dot">·</span>
              <span class="price">\${{ (s.price_cents / 100).toFixed(0) }}</span>
              <span
                class="badge-future"
                data-testid="home-search-future-badge"
                *ngIf="s.is_future">Coming Soon</span>
            </div>
            <div *ngIf="s.description" class="home-search-card-desc">{{ s.description }}</div>
          </button>
          <button
            type="button"
            class="home-search-fav-btn"
            data-testid="home-search-favorite-toggle"
            [attr.data-service-id]="s.id"
            [attr.data-fav]="s.is_favorited ? 'on' : 'off'"
            [attr.aria-pressed]="!!s.is_favorited"
            [attr.aria-label]="s.is_favorited ? 'Unfavorite' : 'Favorite'"
            (click)="toggleFavorite($event, s)">
            <svg width="18" height="18" viewBox="0 0 24 24"
              [attr.fill]="s.is_favorited ? '#7DA8CF' : 'none'"
              stroke="#7DA8CF" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 14c1.5-1.5 3-3.5 3-6a4 4 0 0 0-7-2.6A4 4 0 0 0 8 8c0 2.5 1.5 4.5 3 6l4 4 4-4z"/>
            </svg>
          </button>
        </li>
      </ul>

      <div
        *ngIf="hasQuery && !loading && !errorMessage && !results.length"
        class="home-search-empty"
        data-testid="home-search-empty">
        No services match.
      </div>
    </section>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115;
      --text-muted: #6B6F77; --baby-blue-deep: #7DA8CF;
      --success: #2F7A47; --warn: #C97B1A;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block;
      /* Fill the topnav .search-slot (a flex container) instead of shrinking
         to content width — keeps the native search ✕ flush-right and lets the
         results/empty-state span the search bar. */
      flex: 1;
      min-width: 0;
      font-family: var(--font-body);
      color: var(--text);
    }
    * { box-sizing: border-box; }
    .sr-only {
      position: absolute !important; width: 1px !important; height: 1px !important;
      padding: 0 !important; margin: -1px !important; overflow: hidden !important;
      clip: rect(0,0,0,0) !important; white-space: nowrap !important; border: 0 !important;
    }
    .home-search { padding: 14px 20px 6px; }
    .home-search-box {
      display: flex; align-items: center; gap: 8px;
      background: #FFFFFF; border: 1px solid var(--line);
      border-radius: 12px; padding: 0 12px;
      height: 44px;
    }
    .home-search-box:focus-within { outline: 2px solid #1a3a52; outline-offset: 1px; }
    .home-search-icon { color: var(--text-muted); flex-shrink: 0; }
    .home-search-input {
      flex: 1; height: 100%; border: none; background: transparent;
      font-family: var(--font-body); font-size: 15px; color: var(--text);
    }
    .home-search-input:focus { outline: none; }
    .home-search-status {
      margin-top: 8px; font-family: var(--font-mono);
      font-size: 11px; color: var(--text-muted);
    }
    .home-search-toast {
      margin-top: 10px; padding: 10px 14px; border-radius: 10px; font-size: 13px;
      background: #FFF4E5; color: var(--warn); border: 1px solid #F5D6A4;
    }
    .home-search-toast--error { background: #FCE8E6; color: #B3261E; border-color: #F4C7C3; }
    .home-search-results { list-style: none; padding: 0; margin: 12px 0 0; }
    .home-search-card {
      background: #FFFFFF; border: 1px solid var(--line); border-radius: 14px;
      margin-bottom: 10px; padding: 0;
      display: flex; align-items: stretch;
    }
    .home-search-card-btn {
      flex: 1; min-width: 0; text-align: left; padding: 14px;
      background: transparent; border: none; cursor: pointer;
      font-family: var(--font-body); color: var(--text);
      border-radius: 14px 0 0 14px;
    }
    .home-search-fav-btn {
      flex-shrink: 0; width: 44px;
      background: transparent; border: none; border-left: 1px solid var(--line);
      cursor: pointer; color: var(--baby-blue-deep);
      display: grid; place-items: center;
    }
    .home-search-fav-btn:hover { background: #F2F2F2; }
    .home-search-card-btn:focus-visible {
      outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 14px;
    }
    .home-search-card-name {
      font-family: var(--font-display); font-size: 19px; font-weight: 500;
      letter-spacing: 0.2px; line-height: 1.25; margin-bottom: 2px;
    }
    .home-search-card-provider {
      font-size: 10px; font-weight: 600; color: #1a3a52;
      text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px;
    }
    .home-search-card-meta {
      font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);
      display: flex; align-items: center; gap: 6px; margin-bottom: 4px;
    }
    .home-search-card-meta .dot { opacity: 0.5; }
    .home-search-card-meta .price { color: var(--text); font-weight: 600; }
    .badge-future {
      margin-left: auto;
      background: #E5F4EA; color: var(--success);
      border: 1px solid #B5DCC2;
      padding: 3px 8px; border-radius: 999px;
      font-size: 10px; font-weight: 600; letter-spacing: 0.6px;
      text-transform: uppercase;
    }
    .home-search-card-desc {
      font-size: 12px; color: var(--text-muted); line-height: 1.4;
      overflow: hidden; text-overflow: ellipsis;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .home-search-empty {
      margin-top: 12px; padding: 16px;
      background: #FFFFFF; border: 1px solid var(--line); border-radius: 12px;
      color: var(--text-muted); font-size: 13px; text-align: center;
    }
    @media screen and (max-width: 480px) {
      .home-search { padding: 12px 14px 4px; }
    }
    @media screen and (min-width: 1024px) {
      .home-search { padding-left: 24px; padding-right: 24px; }
    }
  `],
})
export class BeautyHomeSearchComponent implements OnInit, OnDestroy {
  query = '';
  location = '';
  results: SearchItem[] = [];
  loading = false;
  rateLimited = false;
  errorMessage = '';

  private query$ = new Subject<string>();
  private subs: Subscription[] = [];
  private rateToastTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private searchSvc: BeautySearchService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  get hasQuery(): boolean { return this.query.trim().length > 0; }

  ngOnInit(): void {
    this.location = this.searchSvc.readProfileLocation();
    this.subs.push(
      this.query$
        .pipe(debounceTime(DEBOUNCE_MS), distinctUntilChanged())
        .subscribe((q) => {
          if (q.length === 0) {
            this.results = [];
            this.errorMessage = '';
            this.cdr.markForCheck();
            return;
          }
          this.runSearch();
        }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    if (this.rateToastTimeout) clearTimeout(this.rateToastTimeout);
  }

  trackById = (_: number, item: SearchItem): number => item.id;

  onQueryChange(value: string): void {
    this.query$.next((value || '').trim());
  }

  openService(svc: SearchItem): void {
    if (!svc?.id) return;
    this.router.navigate(['/book', svc.id]);
  }

  toggleFavorite(ev: Event, svc: SearchItem): void {
    ev.stopPropagation();
    if (!svc?.id) return;
    const wasOn = !!svc.is_favorited;
    svc.is_favorited = !wasOn;
    this.searchSvc.toggleFavorite(svc, wasOn).subscribe({
      error: () => { svc.is_favorited = wasOn; this.cdr.markForCheck(); },
    });
  }

  private runSearch(): void {
    this.loading = true;
    this.errorMessage = '';

    this.searchSvc.search(this.query.trim(), this.location, 0, PAGE_SIZE)
      .subscribe({
        next: (page) => {
          this.results = page.items;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          if (err.status === 429) {
            this._showRateToast();
          } else {
            this.errorMessage = 'Something went wrong, please try again';
          }
          this.cdr.markForCheck();
        },
      });
  }

  private _showRateToast(): void {
    this.rateLimited = true;
    if (this.rateToastTimeout) clearTimeout(this.rateToastTimeout);
    this.rateToastTimeout = setTimeout(() => {
      this.rateLimited = false;
      this.cdr.markForCheck();
    }, 3000);
  }
}
