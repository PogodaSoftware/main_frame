/**
 * BeautySearchComponent
 * ---------------------
 * Customer-facing search for current and future beauty services.
 *
 * Behavior:
 *   - Debounced query input (300ms) to avoid flooding the backend on
 *     every keystroke. Implemented with rxjs debounceTime.
 *   - Location is auto-applied from the user profile when available
 *     (with browser geolocation as a fallback hook — left as TODO so
 *     the unauthorized prompt does not fire in tests).
 *   - Infinite scroll via IntersectionObserver on a sentinel div at
 *     the bottom of the list. No paging controls.
 *   - 429 responses surface as a "Please slow down" toast.
 *   - Reuses ServiceCard-style markup so the page matches the rest of
 *     the site visually.
 */

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { BffLink } from './beauty-bff.types';
import { BeautySearchService, SearchItem } from './beauty-search.service';
import { CustTopNavComponent } from './cust-web/cust-top-nav.component';

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

@Component({
  selector: 'app-beauty-search',
  standalone: true,
  imports: [CommonModule, FormsModule, CustTopNavComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="beauty-app cust-desk" data-testid="beauty-search-root">
      <app-cust-top-nav active="home" [signedIn]="true" (follow)="onNav($event)"></app-cust-top-nav>

      <main id="main" class="search-main">
      <div class="search-inner">
        <h1 class="search-h1">Search</h1>
        <section class="search-bar">
          <label class="sr-only" for="beauty-search-input">Search services</label>
          <input
            id="beauty-search-input"
            class="search-input"
            type="search"
            autocomplete="off"
            placeholder="Search services"
            [(ngModel)]="query"
            (ngModelChange)="onQueryChange($event)"
            data-testid="search-input"
            aria-label="Search services"
          />
          <span class="location-pill" data-testid="search-location" *ngIf="location">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7DA8CF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {{ location }}
          </span>
        </section>

        <div
          class="search-status"
          data-testid="search-status"
          aria-live="polite"
          role="status">
          <ng-container *ngIf="!loading && !rateLimited">
            {{ totalLoaded }} result{{ totalLoaded === 1 ? '' : 's' }} found
          </ng-container>
          <ng-container *ngIf="loading">Loading…</ng-container>
        </div>

        <div
          class="rate-toast"
          data-testid="search-rate-toast"
          role="alert"
          *ngIf="rateLimited">
          Please slow down
        </div>

        <div
          class="error-toast"
          data-testid="search-error-toast"
          role="alert"
          *ngIf="errorMessage">
          {{ errorMessage }}
        </div>

        <ul
          class="results"
          role="list"
          data-testid="search-results"
          aria-label="Search results">
          <li
            *ngFor="let s of results; trackBy: trackById"
            class="service-card result-card"
            role="listitem"
            data-testid="search-result-card"
            [attr.data-is-future]="s.is_future ? 'true' : 'false'"
            [attr.data-service-id]="s.id"
            [attr.data-provider-id]="s.provider.id">
            <button
              type="button"
              class="result-card-btn"
              data-testid="search-result-link"
              [attr.data-provider-id]="s.provider.id"
              (click)="openProvider(s)">
              <div class="result-row">
                <div class="result-info">
                  <div class="service-name">{{ s.name }}</div>
                  <div class="service-cat" data-testid="search-result-business">{{ s.provider.name }}</div>
                  <div class="service-meta">
                    <span>{{ s.duration_minutes }} min</span>
                    <span class="dot">·</span>
                    <span class="price">\${{ (s.price_cents / 100).toFixed(0) }}</span>
                  </div>
                  <div *ngIf="s.description" class="service-desc">{{ s.description }}</div>
                  <span
                    class="badge-future"
                    data-testid="search-future-badge"
                    *ngIf="s.is_future">Coming Soon</span>
                </div>
              </div>
            </button>
            <button
              type="button"
              class="search-fav-btn"
              data-testid="search-favorite-toggle"
              [attr.data-service-id]="s.id"
              [attr.data-fav]="s.is_favorited ? 'on' : 'off'"
              [attr.aria-pressed]="!!s.is_favorited"
              [attr.aria-label]="s.is_favorited ? 'Unfavorite' : 'Favorite'"
              (click)="toggleFavorite($event, s)">
              <svg width="20" height="20" viewBox="0 0 24 24"
                [attr.fill]="s.is_favorited ? '#7DA8CF' : 'none'"
                stroke="#7DA8CF" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.5-1.5 3-3.5 3-6a4 4 0 0 0-7-2.6A4 4 0 0 0 8 8c0 2.5 1.5 4.5 3 6l4 4 4-4z"/>
              </svg>
            </button>
          </li>
        </ul>

        <div
          *ngIf="!loading && !errorMessage && !results.length"
          class="empty-state"
          data-testid="search-empty">
          No services match your search.
        </div>

        <div
          #sentinel
          class="infinite-sentinel"
          data-testid="search-sentinel"
          aria-hidden="true"></div>

        <div
          *ngIf="!hasMore && results.length"
          class="end-marker"
          data-testid="search-end-marker">
          No more results
        </div>
      </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --baby-blue-deep: #7DA8CF; --ink: #0A0A0B;
      --success: #2F7A47; --warn: #C97B1A;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
    }
    * { box-sizing: border-box; }
    .sr-only {
      position: absolute !important; width: 1px !important; height: 1px !important;
      padding: 0 !important; margin: -1px !important; overflow: hidden !important;
      clip: rect(0,0,0,0) !important; white-space: nowrap !important; border: 0 !important;
    }
    .beauty-app {
      display: flex; flex-direction: column; min-height: 100dvh;
      background: var(--surface); color: var(--text); font-family: var(--font-body);
    }
    .sub-header {
      display: flex; align-items: center; height: 56px; padding: 0 12px;
      background: var(--surface); border-bottom: 1px solid var(--line);
    }
    .sub-header-title { font-family: var(--font-display); font-size: 20px; margin: 0 0 0 8px; }
    .sub-header-spacer-flex { flex: 1; }
    .back-btn {
      min-width: 44px; min-height: 44px; border-radius: 8px;
      background: transparent; border: none; color: var(--text);
      display: grid; place-items: center; cursor: pointer;
    }
    .back-btn:hover { background: var(--surface-2); }
    .search-bar {
      padding: 14px 16px 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
    }
    .search-input {
      flex: 1; min-width: 220px; height: 44px;
      border: 1px solid var(--line); border-radius: 12px;
      padding: 0 14px; background: #FFFFFF; color: var(--text);
      font-family: var(--font-body); font-size: 15px;
    }
    .search-input:focus { outline: 2px solid #1a3a52; outline-offset: 1px; }
    .location-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 10px; border-radius: 999px;
      background: #FFFFFF; border: 1px solid var(--line);
      font-size: 11px; font-weight: 500; white-space: nowrap;
    }
    .search-status {
      padding: 6px 16px 12px; font-family: var(--font-mono);
      font-size: 11px; color: var(--text-muted);
    }
    .rate-toast, .error-toast {
      margin: 0 16px 12px; padding: 10px 14px;
      border-radius: 10px; font-size: 13px;
      background: #FFF4E5; color: var(--warn); border: 1px solid #F5D6A4;
    }
    .error-toast { background: #FCE8E6; color: #B3261E; border-color: #F4C7C3; }
    .results { list-style: none; padding: 0; margin: 0 16px; }
    .service-card {
      background: #FFFFFF; border: 1px solid var(--line); border-radius: 14px;
      padding: 0; margin-bottom: 12px;
    }
    .service-card { display: flex; align-items: stretch; }
    .result-card-btn {
      display: block; flex: 1; min-width: 0; text-align: left;
      background: transparent; border: none; cursor: pointer;
      padding: 14px; border-radius: 14px 0 0 14px;
      font-family: var(--font-body); color: var(--text);
    }
    .result-card-btn:focus-visible {
      outline: 2px solid #1a3a52; outline-offset: 2px;
    }
    .result-card-btn:hover { background: #FAFAFA; }
    .search-fav-btn {
      flex-shrink: 0; width: 48px;
      background: transparent; border: none; border-left: 1px solid var(--line);
      cursor: pointer; color: var(--baby-blue-deep);
      display: grid; place-items: center;
    }
    .search-fav-btn:hover { background: var(--surface-2); }
    .result-row { display: flex; gap: 12px; }
    .result-info { flex: 1; min-width: 0; }
    .service-name {
      font-family: var(--font-display); font-size: 19px; font-weight: 500;
      letter-spacing: 0.2px; line-height: 1.25; margin-bottom: 2px;
    }
    .service-cat {
      font-size: 10px; font-weight: 600; color: #1a3a52;
      text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px;
    }
    .service-meta {
      font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);
      margin-bottom: 4px;
    }
    .service-meta .dot { margin: 0 6px; opacity: 0.5; }
    .service-meta .price { color: var(--text); font-weight: 600; }
    .service-desc {
      font-size: 12px; color: var(--text-muted); line-height: 1.4;
      overflow: hidden; text-overflow: ellipsis;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .badge-future {
      display: inline-block; margin-top: 6px;
      background: #E5F4EA; color: var(--success);
      border: 1px solid #B5DCC2;
      padding: 3px 8px; border-radius: 999px;
      font-size: 10px; font-weight: 600; letter-spacing: 0.6px;
      text-transform: uppercase;
    }
    .empty-state, .end-marker {
      text-align: center; padding: 24px 16px;
      color: var(--text-muted); font-size: 13px;
    }
    .infinite-sentinel { width: 100%; height: 1px; }

    /* Desktop (cust-top-nav chrome) — web is desktop-only; RN is mobile. */
    .search-main { flex: 1; }
    .search-inner { max-width: 760px; margin: 0 auto; padding: 28px 24px 48px; width: 100%; }
    .search-h1 { font-family: var(--font-display); font-size: 38px; font-weight: 500; margin: 0 0 12px; }
    .search-bar { padding: 0 0 8px; }
    .search-status { padding: 6px 0 12px; }
    .results { margin: 0; }
    .rate-toast, .error-toast { margin: 0 0 12px; }
    @media screen and (max-width: 720px) {
      .search-inner { padding: 16px 16px 32px; }
      .search-h1 { font-size: 28px; }
    }
  `],
})
export class BeautySearchComponent implements OnInit, AfterViewInit, OnDestroy {
  query = '';
  location = '';
  results: SearchItem[] = [];
  loading = false;
  rateLimited = false;
  errorMessage = '';
  hasMore = false;

  private nextOffset: number | null = 0;
  private query$ = new Subject<string>();
  private subs: Subscription[] = [];
  private observer: IntersectionObserver | null = null;
  private rateToastTimeout: ReturnType<typeof setTimeout> | null = null;

  @ViewChild('sentinel', { static: false }) sentinel?: ElementRef<HTMLDivElement>;

  constructor(
    private searchSvc: BeautySearchService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  get totalLoaded(): number { return this.results.length; }

  ngOnInit(): void {
    this.location = this.searchSvc.readProfileLocation();
    this.subs.push(
      this.query$
        .pipe(debounceTime(DEBOUNCE_MS), distinctUntilChanged())
        .subscribe(() => this.runSearch(true)),
    );
    // Initial empty-query load shows everything (paged).
    this.runSearch(true);
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.sentinel) return;
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !this.loading && this.hasMore) {
          this.runSearch(false);
        }
      }
    }, { rootMargin: '200px 0px' });
    this.observer.observe(this.sentinel.nativeElement);
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.observer?.disconnect();
    if (this.rateToastTimeout) clearTimeout(this.rateToastTimeout);
  }

  trackById = (_: number, item: SearchItem): number => item.id;

  onQueryChange(value: string): void {
    this.query$.next((value || '').trim());
  }

  goBack(): void {
    if (isPlatformBrowser(this.platformId)) window.history.back();
  }

  /** cust-top-nav emits NAV links; route directly (this page isn't SDUI). */
  onNav(link: BffLink): void {
    if (link?.route) this.router.navigateByUrl(link.route);
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

  openProvider(svc: SearchItem): void {
    const providerId = svc?.provider?.id;
    if (!providerId) return;
    this.router.navigate(['/providers', providerId]);
  }

  private runSearch(reset: boolean): void {
    if (reset) {
      this.nextOffset = 0;
      this.results = [];
      this.hasMore = false;
    }
    if (this.loading) return;
    if (this.nextOffset === null) return;

    this.loading = true;
    this.errorMessage = '';

    this.searchSvc.search(this.query, this.location, this.nextOffset, PAGE_SIZE)
      .subscribe({
        next: (page) => {
          this.results = reset ? page.items : this.results.concat(page.items);
          this.nextOffset = page.next_offset;
          this.hasMore = page.has_more;
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
