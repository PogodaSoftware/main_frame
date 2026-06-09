/**
 * BeautyFavoritesComponent
 * ------------------------
 * Standalone customer page at /pogoda/beauty/saved.
 *
 * Lists every service the customer has favorited (via the heart on
 * the provider page or search cards). Tapping a row navigates to the
 * provider page; tapping the heart removes the favorite (optimistic
 * UI, refresh on error).
 */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { environment } from '../../environments/environment';
import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { CustTopNavComponent } from './cust-web/cust-top-nav.component';
import { BeautyHomeSearchComponent } from './beauty-home-search.component';

interface FavoriteProvider {
  id: number;
  name: string;
  short_description: string;
  location_label: string;
}

interface FavoriteService {
  id: number;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  duration_minutes: number;
}

interface FavoriteRow {
  id: number;
  created_at: string;
  service: FavoriteService;
  provider: FavoriteProvider;
}

interface FavoritesResponse {
  items: FavoriteRow[];
  count: number;
}

@Component({
  selector: 'app-beauty-favorites',
  standalone: true,
  imports: [CommonModule, CustTopNavComponent, BeautyHomeSearchComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="cust-saved" data-testid="favorites-root">
      <app-cust-top-nav active="fav" [links]="{}" [signedIn]="true" (follow)="onNav($event)">
        <app-beauty-home-search topnav-search></app-beauty-home-search>
      </app-cust-top-nav>

      <main id="main" class="saved-main">
        <div class="saved-inner">
          <h1 class="title">Saved</h1>
          <div class="subtitle">Services you've hearted, ready to re-book.</div>

          <div class="status" *ngIf="loading" data-testid="favorites-loading">Loading…</div>

          <div *ngIf="!loading && !rows.length" class="empty-state" data-testid="favorites-empty">
            <div class="empty-title">No saved services yet</div>
            <div class="empty-sub">Tap the heart on any service to save it here.</div>
          </div>

          <div class="grid" role="list" data-testid="favorites-list" *ngIf="!loading && rows.length">
            <article
              *ngFor="let r of rows; trackBy: trackById"
              class="fav-card" role="listitem"
              data-testid="favorites-card"
              [attr.data-favorite-id]="r.id"
              [attr.data-service-id]="r.service.id"
              [attr.data-provider-id]="r.provider.id">
              <button type="button" class="fav-body" (click)="openProvider(r)">
                <div class="service-name">{{ r.service.name }}</div>
                <div class="service-cat" data-testid="favorites-business">{{ r.provider.name }}</div>
                <div class="service-meta">
                  <span>{{ r.service.duration_minutes }} min</span>
                  <span class="dot">·</span>
                  <span class="price">\${{ (r.service.price_cents / 100).toFixed(0) }}</span>
                </div>
                <div *ngIf="r.service.description" class="service-desc">{{ r.service.description }}</div>
              </button>
              <button
                type="button" class="fav-btn"
                data-testid="favorites-remove-btn"
                [attr.data-service-id]="r.service.id"
                aria-label="Remove from saved" (click)="remove(r)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#7DA8CF" stroke="#7DA8CF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.5 3-3.5 3-6a4 4 0 0 0-7-2.6A4 4 0 0 0 8 8c0 2.5 1.5 4.5 3 6l4 4 4-4z"/></svg>
              </button>
            </article>
          </div>

          <div class="error-toast" *ngIf="errorMessage" data-testid="favorites-error" role="alert">{{ errorMessage }}</div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue-text: #1a3a52; --baby-blue-deep: #7DA8CF; --ink: #0A0A0B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh; background: var(--surface);
      color: var(--text); font-family: var(--font-body);
    }
    * { box-sizing: border-box; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .cust-saved { display: flex; flex-direction: column; min-height: 100dvh; }
    .saved-main { flex: 1; padding: 32px 32px 48px; }
    .saved-inner { max-width: 1280px; margin: 0 auto; }
    .title { font-family: var(--font-display); font-size: 42px; font-weight: 500; }
    .subtitle { margin-top: 6px; font-size: 14px; color: var(--text-muted); }

    .status, .empty-state {
      margin-top: 24px; padding: 40px 24px; text-align: center; color: var(--text-muted);
      background: #fff; border: 1px dashed var(--line); border-radius: 16px;
    }
    .empty-title { font-family: var(--font-display); font-size: 22px; color: var(--text-muted); }
    .empty-sub { font-size: 13px; margin-top: 6px; }

    .grid { margin-top: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; list-style: none; padding: 0; }
    .fav-card { display: flex; background: #fff; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
    .fav-body { flex: 1; min-width: 0; text-align: left; padding: 18px 20px; background: transparent; border: none; cursor: pointer; font-family: var(--font-body); color: var(--text); }
    .fav-body:hover { background: #FAFAFA; }
    .service-name { font-family: var(--font-display); font-size: 22px; font-weight: 500; line-height: 1.2; }
    .service-cat { font-size: 10px; font-weight: 600; color: var(--accent-blue-text); text-transform: uppercase; letter-spacing: 1.2px; margin-top: 4px; }
    .service-meta { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 6px; }
    .service-meta .dot { margin: 0 6px; opacity: .5; }
    .service-meta .price { color: var(--text); font-weight: 600; }
    .service-desc { font-size: 12px; color: var(--text-muted); line-height: 1.45; margin-top: 8px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .fav-btn { flex-shrink: 0; width: 52px; background: transparent; border: none; border-left: 1px solid var(--line); cursor: pointer; color: var(--baby-blue-deep); display: grid; place-items: center; }
    .fav-btn:hover { background: var(--surface-2); }
    .error-toast { margin-top: 12px; padding: 10px 14px; border-radius: 10px; background: #FCE8E6; color: #B3261E; border: 1px solid #F4C7C3; font-size: 13px; }

    @media (max-width: 1100px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } .saved-main { padding: 20px; } .title { font-size: 32px; } }
  `],
})
export class BeautyFavoritesComponent implements OnInit {
  rows: FavoriteRow[] = [];
  loading = true;
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private auth: BeautyAuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  goBack(): void {
    if (isPlatformBrowser(this.platformId)) window.history.back();
  }

  /** CustTopNav emits NAV links with absolute routes (e.g. /pogoda/beauty/bookings).
   *  Angular's base href is /pogoda/beauty/, so strip that prefix before
   *  navigating (mirrors the shell's own route handling). */
  onNav(link: BffLink | null | undefined): void {
    if (!link?.route) return;
    this.router.navigateByUrl(link.route.replace(/^\/pogoda\/beauty/, '') || '/');
  }

  trackById = (_: number, item: FavoriteRow): number => item.id;

  openProvider(row: FavoriteRow): void {
    if (!row?.provider?.id) return;
    this.router.navigateByUrl(`/providers/${row.provider.id}`);
  }

  remove(row: FavoriteRow): void {
    if (!row?.service?.id) return;
    const before = this.rows;
    this.rows = this.rows.filter((r) => r.id !== row.id);
    this.cdr.markForCheck();
    const url = `${environment.apiBaseUrl}/api/beauty/protected/services/${row.service.id}/favorite/`;
    this.http.delete(url, {
      withCredentials: true,
      headers: this.auth.getAuthHeaders(),
    }).subscribe({
      error: () => {
        this.rows = before;
        this.errorMessage = 'Could not remove favorite.';
        this.cdr.markForCheck();
      },
    });
  }

  private load(): void {
    const url = `${environment.apiBaseUrl}/api/beauty/protected/favorites/`;
    this.http.get<FavoritesResponse>(url, {
      withCredentials: true,
      headers: this.auth.getAuthHeaders(),
    }).subscribe({
      next: (resp) => {
        this.rows = resp?.items || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        if (err.status === 403) {
          this.errorMessage = 'Sign in as a customer to view your saved services.';
        } else {
          this.errorMessage = 'Could not load saved services.';
        }
        this.cdr.markForCheck();
      },
    });
  }
}
