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
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="beauty-app" data-testid="favorites-root">
      <header class="sub-header">
        <button type="button" class="back-btn" aria-label="Back" (click)="goBack()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 class="sub-header-title">Saved</h1>
        <span class="sub-header-spacer-flex"></span>
      </header>

      <main id="main">
        <div class="status" *ngIf="loading" data-testid="favorites-loading">Loading…</div>

        <div
          *ngIf="!loading && !rows.length"
          class="empty-state"
          data-testid="favorites-empty">
          No saved services yet.
        </div>

        <ul class="results" role="list" data-testid="favorites-list" *ngIf="!loading && rows.length">
          <li
            *ngFor="let r of rows; trackBy: trackById"
            class="service-card result-card"
            role="listitem"
            data-testid="favorites-card"
            [attr.data-favorite-id]="r.id"
            [attr.data-service-id]="r.service.id"
            [attr.data-provider-id]="r.provider.id">
            <button
              type="button"
              class="result-card-btn"
              (click)="openProvider(r)">
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
              type="button"
              class="fav-btn"
              data-testid="favorites-remove-btn"
              [attr.data-service-id]="r.service.id"
              aria-label="Remove from saved"
              (click)="remove(r)">
              <svg width="20" height="20" viewBox="0 0 24 24"
                fill="#7DA8CF" stroke="#7DA8CF" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.5-1.5 3-3.5 3-6a4 4 0 0 0-7-2.6A4 4 0 0 0 8 8c0 2.5 1.5 4.5 3 6l4 4 4-4z"/>
              </svg>
            </button>
          </li>
        </ul>

        <div class="error-toast" *ngIf="errorMessage" data-testid="favorites-error" role="alert">
          {{ errorMessage }}
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --baby-blue-deep: #7DA8CF; --ink: #0A0A0B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
    }
    * { box-sizing: border-box; }
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
    .status, .empty-state {
      margin: 24px 16px; padding: 18px; text-align: center;
      color: var(--text-muted); font-size: 13px;
      background: #FFFFFF; border: 1px dashed var(--line); border-radius: 12px;
    }
    .results { list-style: none; padding: 0; margin: 0 16px; display: flex; flex-direction: column; gap: 10px; }
    .service-card {
      background: #FFFFFF; border: 1px solid var(--line); border-radius: 14px;
      padding: 0; display: flex; align-items: stretch;
    }
    .result-card-btn {
      flex: 1; min-width: 0; text-align: left; padding: 12px 14px;
      background: transparent; border: none; cursor: pointer;
      font-family: var(--font-body); color: var(--text);
      border-radius: 14px 0 0 14px;
    }
    .result-card-btn:hover { background: #FAFAFA; }
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
    .fav-btn {
      flex-shrink: 0;
      width: 48px;
      background: transparent; border: none; border-left: 1px solid var(--line);
      cursor: pointer; color: var(--baby-blue-deep);
      display: grid; place-items: center;
    }
    .fav-btn:hover { background: var(--surface-2); }
    .error-toast {
      margin: 12px 16px; padding: 10px 14px; border-radius: 10px;
      background: #FCE8E6; color: #B3261E; border: 1px solid #F4C7C3;
      font-size: 13px;
    }
    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
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
