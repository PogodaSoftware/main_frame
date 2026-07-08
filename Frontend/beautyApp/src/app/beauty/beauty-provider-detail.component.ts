/**
 * BeautyProviderDetailComponent (Presentational)
 * ----------------------------------------------
 * Customer-web business / studio detail. Desktop layout per design
 * `WebCustomerBusiness`: shared CustTopNav, a StudioHero (gradient + name +
 * rating + Book/Save/Share + photo collage), a tab bar (Services / Reviews /
 * About / Location), a services list with per-service Book + favourite, and a
 * location sidebar. Collapses to single column on mobile. RN app untouched.
 *
 * All behaviour is preserved and BFF-driven: per-service `book` / `favorite` /
 * `unfavorite` links, reviews list, owner review delete, and the `write_review`
 * action. The hero "Book now" scrolls to the services list (there is no
 * provider-level book link — booking is per service).
 *
 * NOTE: the design's Hours card and Photos tab have no backing BFF data, so
 * they are omitted; the location card uses `location_label` + a Google Maps
 * directions link.
 */

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { BffLink } from './beauty-bff.types';
import { BeautyAuthService } from './beauty-auth.service';
import { environment } from '../../environments/environment';
import { CustTopNavComponent } from './cust-web/cust-top-nav.component';
import { BeautyHomeSearchComponent } from './beauty-home-search.component';

interface ProviderInfo {
  id: number;
  name: string;
  short_description: string;
  long_description: string;
  location_label: string;
  avg_rating?: number | null;
  review_count?: number;
}

interface ProviderService {
  id: number;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  duration_minutes: number;
  is_favorited?: boolean;
  _links?: Record<string, BffLink>;
}

interface ProviderReview {
  id: number;
  rating: number;
  body: string;
  business_reply: string;
  business_reply_at: string | null;
  created_at: string;
  is_owner: boolean;
  service_id: number;
  service_name: string;
  customer_initial: string;
}

type DetailTab = 'services' | 'reviews' | 'about' | 'location';

// Category → hero gradient hue (mirrors the home category palette).
const CATEGORY_HUE: Record<string, string> = {
  hair: '#5C4A3F', nails: '#A88A7A', brows: '#5F5A4A', lashes: '#574A3D',
  facial: '#7A8B6E', facials: '#7A8B6E', massage: '#3A3A3A', wax: '#A06B2C', makeup: '#5C4A8A',
};

@Component({
  selector: 'app-beauty-provider-detail',
  standalone: true,
  imports: [CommonModule, CustTopNavComponent, BeautyHomeSearchComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="cust-detail" *ngIf="provider as p" [style.--hue]="heroHue">
      <app-cust-top-nav
        active=""
        [links]="links"
        [signedIn]="true"
        (follow)="emit($event)"
      >
        <app-beauty-home-search topnav-search></app-beauty-home-search>
      </app-cust-top-nav>

      <main id="main">
        <!-- Hero -->
        <section class="hero">
          <div class="hero-inner">
            <div class="hero-copy">
              <div class="eyebrow" *ngIf="categoriesLine">{{ categoriesLine }}</div>
              <h1 class="hero-title">{{ p.name }}</h1>
              <div class="hero-meta">
                <span class="rating" *ngIf="reviewCount > 0; else noRev">
                  ★ <span data-testid="provider-avg-rating">{{ avgRatingDisplay }}</span>
                </span>
                <ng-template #noRev><span class="rating rating--none">No reviews yet</span></ng-template>
                <span class="meta-mono" *ngIf="reviewCount > 0" data-testid="provider-review-count">({{ reviewCount }} reviews)</span>
                <span class="meta-sep" *ngIf="p.location_label">·</span>
                <span class="meta-mono" *ngIf="p.location_label">{{ p.location_label }}</span>
              </div>
              <div class="hero-cta">
                <button type="button" class="btn btn--primary btn--lg" (click)="scrollToServices()">Book now</button>
                <button type="button" class="btn btn--secondary btn--lg" (click)="scrollToServices()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.5-9.5-9C1 9.5 2.5 5 7 5c2.5 0 4 1.5 5 3 1-1.5 2.5-3 5-3 4.5 0 6 4.5 4.5 7C19 16.5 12 21 12 21z"/></svg>
                  Save
                </button>
                <button type="button" class="btn btn--ghost btn--lg" (click)="share()">{{ shareLabel }}</button>
              </div>
            </div>
            <div class="hero-collage" aria-hidden="true">
              <span class="tile tile--lg"></span>
              <span class="tile"></span>
              <span class="tile"></span>
            </div>
          </div>
        </section>

        <!-- Tabs -->
        <div class="tabs">
          <div class="tabs-inner">
            <button type="button" class="tab" [class.is-active]="activeTab==='services'" (click)="activeTab='services'">
              Services <span class="tab-c">({{ services.length }})</span>
            </button>
            <button type="button" class="tab" [class.is-active]="activeTab==='reviews'" (click)="activeTab='reviews'">
              Reviews <span class="tab-c">({{ reviewCount }})</span>
            </button>
            <button type="button" class="tab" [class.is-active]="activeTab==='about'" (click)="activeTab='about'" *ngIf="p.long_description || p.short_description">About</button>
            <button type="button" class="tab" [class.is-active]="activeTab==='location'" (click)="activeTab='location'" *ngIf="p.location_label">Location</button>
          </div>
        </div>

        <div class="body">
          <!-- SERVICES -->
          <div class="body-inner body-inner--split" *ngIf="activeTab==='services'">
            <div #servicesTop>
              <div class="section-head">
                <h2 class="section-title">Services</h2>
                <span class="section-sub">{{ services.length }} service{{ services.length === 1 ? '' : 's' }}</span>
              </div>
              <div class="svc-list">
                <article class="svc-card" *ngFor="let s of services">
                  <span class="svc-thumb"></span>
                  <div class="svc-main">
                    <div class="svc-top">
                      <div class="svc-name">{{ s.name }}</div>
                      <div class="svc-price">\${{ (s.price_cents / 100).toFixed(0) }}</div>
                    </div>
                    <div class="svc-cat" *ngIf="s.category">{{ toTitle(s.category) }}</div>
                    <p class="svc-desc" *ngIf="s.description">{{ s.description }}</p>
                    <div class="svc-foot">
                      <span class="svc-dur">{{ s.duration_minutes }} min</span>
                      <div class="svc-actions">
                        <button
                          type="button" class="fav-btn"
                          data-testid="favorite-toggle"
                          [attr.data-service-id]="s.id"
                          [attr.data-fav]="s.is_favorited ? 'on' : 'off'"
                          [attr.aria-pressed]="!!s.is_favorited"
                          [attr.aria-label]="s.is_favorited ? 'Unfavorite' : 'Favorite'"
                          (click)="toggleFavorite(s)"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" [attr.fill]="s.is_favorited ? '#7DA8CF' : 'none'" stroke="#7DA8CF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.5 3-3.5 3-6a4 4 0 0 0-7-2.6A4 4 0 0 0 8 8c0 2.5 1.5 4.5 3 6l4 4 4-4z"/></svg>
                        </button>
                        <button type="button" class="btn btn--primary btn--sm" (click)="emit(s._links?.['book'])" [disabled]="!s._links?.['book']">Book</button>
                      </div>
                    </div>
                  </div>
                </article>
                <div *ngIf="!services.length" class="empty">No services listed yet.</div>
              </div>
            </div>

            <aside class="sidebar">
              <div class="loc-card">
                <div class="loc-map">
                  <span class="loc-pin">{{ p.name }}</span>
                </div>
                <div class="loc-body">
                  <div class="loc-addr" *ngIf="p.location_label">{{ p.location_label }}</div>
                  <a class="btn btn--secondary btn--sm btn--full" [href]="directionsUrl" target="_blank" rel="noopener">Directions →</a>
                </div>
              </div>
            </aside>
          </div>

          <!-- REVIEWS -->
          <div class="body-inner" *ngIf="activeTab==='reviews'" data-testid="reviews-section">
            <div class="section-head">
              <h2 class="section-title">Reviews</h2>
              <span class="section-sub" data-testid="reviews-count-pill">{{ reviewCount }} total</span>
            </div>
            <div class="review-cta" *ngIf="canReview">
              <button type="button" class="btn btn--primary btn--sm" data-testid="leave-review-btn" (click)="emit(links['write_review'])">Leave a review</button>
            </div>
            <div class="reviews-grid" *ngIf="reviews.length; else emptyReviews">
              <div class="review-card" *ngFor="let r of reviews" data-testid="review-card" [attr.data-review-id]="r.id">
                <div class="review-head">
                  <span class="review-avatar" aria-hidden="true">{{ r.customer_initial }}</span>
                  <span class="review-stars" data-testid="review-stars" [attr.data-rating]="r.rating">
                    <ng-container *ngFor="let i of [1,2,3,4,5]">
                      <svg width="13" height="13" viewBox="0 0 24 24" [attr.fill]="i <= r.rating ? '#F5C36B' : '#E5E5EA'" [attr.stroke]="i <= r.rating ? '#F5C36B' : '#E5E5EA'" stroke-width="1" stroke-linejoin="round"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z"/></svg>
                    </ng-container>
                  </span>
                  <span class="review-service">{{ r.service_name }}</span>
                  <span class="review-when">{{ formatDate(r.created_at) }}</span>
                </div>
                <p class="review-body" *ngIf="r.body" data-testid="review-body">{{ r.body }}</p>
                <div class="review-reply" *ngIf="r.business_reply" data-testid="review-business-reply">
                  <div class="review-reply-head">Owner reply</div>
                  <p class="review-reply-body">{{ r.business_reply }}</p>
                </div>
                <div class="review-actions" *ngIf="r.is_owner">
                  <button type="button" class="review-action-delete" data-testid="review-delete-btn" [attr.data-review-id]="r.id" (click)="onDeleteReview(r.id)">Delete my review</button>
                </div>
              </div>
            </div>
            <ng-template #emptyReviews>
              <div class="empty empty--box" data-testid="reviews-empty">No reviews yet. Be the first to leave one.</div>
            </ng-template>
          </div>

          <!-- ABOUT -->
          <div class="body-inner" *ngIf="activeTab==='about'">
            <div class="section-head"><h2 class="section-title">About {{ p.name }}</h2></div>
            <div class="about-card">
              <p class="about-lead" *ngIf="p.short_description">{{ p.short_description }}</p>
              <p class="about-body" *ngIf="p.long_description">{{ p.long_description }}</p>
            </div>
          </div>

          <!-- LOCATION -->
          <div class="body-inner" *ngIf="activeTab==='location'">
            <div class="section-head"><h2 class="section-title">Location</h2></div>
            <div class="loc-card loc-card--wide">
              <div class="loc-map loc-map--tall"><span class="loc-pin">{{ p.name }}</span></div>
              <div class="loc-body">
                <div class="loc-addr" *ngIf="p.location_label">{{ p.location_label }}</div>
                <a class="btn btn--secondary btn--sm" [href]="directionsUrl" target="_blank" rel="noopener">Directions →</a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --ink: #0A0A0B; --ink-soft: #1F1F22; --danger: #C0392B;
      --hue: #5C4A3F;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh; background: var(--surface);
      font-family: var(--font-body); color: var(--text);
    }
    * { box-sizing: border-box; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .cust-detail { display: flex; flex-direction: column; min-height: 100dvh; }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 10px; font-family: var(--font-body); font-weight: 600; cursor: pointer; border: 1px solid transparent; text-decoration: none; transition: background 150ms ease, border-color 150ms ease; }
    .btn--lg { height: 48px; padding: 0 22px; font-size: 15px; }
    .btn--sm { height: 38px; padding: 0 16px; font-size: 13px; }
    .btn--full { width: 100%; }
    .btn--primary { background: var(--ink); color: #fff; border-color: var(--ink); }
    .btn--primary:hover:not(:disabled) { background: var(--ink-soft); border-color: var(--ink-soft); }
    .btn--primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn--secondary { background: #fff; color: var(--text); border-color: var(--line); }
    .btn--secondary:hover { border-color: var(--accent-blue-deep); }
    .btn--ghost { background: transparent; color: var(--text); border-color: transparent; }
    .btn--ghost:hover { background: rgba(15,17,21,0.06); }

    /* Hero */
    .hero { padding: 32px 32px 24px; border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, color-mix(in srgb, var(--hue) 28%, #F2F2F2) 0%, #F2F2F2 100%); }
    .hero-inner { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: 2fr 3fr; gap: 28px; align-items: center; }
    .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-muted); }
    .hero-title { margin: 8px 0 0; font-family: var(--font-display); font-size: 56px; font-weight: 500; line-height: 1.05; letter-spacing: .2px; }
    .hero-meta { margin-top: 12px; display: flex; align-items: center; gap: 12px; font-size: 14px; flex-wrap: wrap; }
    .rating { font-weight: 600; }
    .rating--none { color: var(--text-muted); font-weight: 500; }
    .meta-mono { font-family: var(--font-mono); font-size: 12px; color: var(--text); }
    .meta-sep { color: var(--text-muted); }
    .hero-cta { margin-top: 22px; display: flex; gap: 10px; flex-wrap: wrap; }

    .hero-collage { display: grid; grid-template-columns: 2fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; aspect-ratio: 2 / 1; }
    .tile { border-radius: 16px; background:
      repeating-linear-gradient(135deg, color-mix(in srgb, var(--hue) 24%, transparent) 0, color-mix(in srgb, var(--hue) 24%, transparent) 8px, color-mix(in srgb, var(--hue) 36%, transparent) 8px, color-mix(in srgb, var(--hue) 36%, transparent) 16px), color-mix(in srgb, var(--hue) 45%, #fff); }
    .tile--lg { grid-row: 1 / 3; }

    /* Tabs */
    .tabs { background: #fff; border-bottom: 1px solid var(--line); padding: 0 32px; }
    .tabs-inner { max-width: 1400px; margin: 0 auto; display: flex; gap: 4px; }
    .tab { position: relative; padding: 14px 16px; background: none; border: none; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--text-muted); display: inline-flex; align-items: center; gap: 6px; }
    .tab:hover { color: var(--text); }
    .tab.is-active { color: var(--text); font-weight: 600; }
    .tab.is-active::after { content: ''; position: absolute; left: 16px; right: 16px; bottom: -1px; height: 2px; background: var(--ink); }
    .tab-c { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }

    /* Body */
    .body { padding: 28px 32px 48px; }
    .body-inner { max-width: 1400px; margin: 0 auto; }
    .body-inner--split { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; align-items: start; }
    .section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px; }
    .section-title { font-family: var(--font-display); font-size: 30px; font-weight: 500; }
    .section-sub { font-size: 13px; color: var(--text-muted); font-family: var(--font-mono); }

    /* Service cards */
    .svc-list { display: flex; flex-direction: column; gap: 12px; }
    .svc-card { display: flex; gap: 14px; align-items: flex-start; background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 20px; }
    .svc-thumb { width: 56px; height: 56px; border-radius: 12px; flex-shrink: 0; border: 1px solid var(--line);
      background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--hue) 18%, transparent) 0, color-mix(in srgb, var(--hue) 18%, transparent) 6px, color-mix(in srgb, var(--hue) 28%, transparent) 6px, color-mix(in srgb, var(--hue) 28%, transparent) 12px), color-mix(in srgb, var(--hue) 40%, #fff); }
    .svc-main { flex: 1; min-width: 0; }
    .svc-top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .svc-name { font-family: var(--font-display); font-size: 22px; font-weight: 500; line-height: 1.15; }
    .svc-price { font-family: var(--font-mono); font-size: 16px; font-weight: 600; white-space: nowrap; }
    .svc-cat { font-size: 10px; font-weight: 600; color: var(--accent-blue-text); text-transform: uppercase; letter-spacing: 1.2px; margin-top: 4px; }
    .svc-desc { font-size: 13px; color: var(--text-muted); margin-top: 6px; line-height: 1.5; }
    .svc-foot { margin-top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .svc-dur { font-family: var(--font-mono); font-size: 12px; color: var(--accent-blue-text); }
    .svc-actions { display: flex; align-items: center; gap: 8px; }
    .fav-btn { width: 38px; height: 38px; border-radius: 10px; background: #fff; border: 1px solid var(--line); display: grid; place-items: center; cursor: pointer; }
    .fav-btn[data-fav='on'] { border-color: var(--accent-blue-deep); background: rgba(125,168,207,0.08); }
    .fav-btn:hover { background: var(--surface-2); }

    /* Sidebar / location */
    .sidebar { display: flex; flex-direction: column; gap: 14px; }
    .loc-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
    .loc-card--wide { max-width: 720px; }
    .loc-map { aspect-ratio: 4 / 3; background: var(--surface-2); display: grid; place-items: center;
      background-image: linear-gradient(rgba(125,168,207,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(125,168,207,0.07) 1px, transparent 1px); background-size: 32px 32px; }
    .loc-map--tall { aspect-ratio: 16 / 7; }
    .loc-pin { background: var(--ink); color: #fff; padding: 6px 10px; border-radius: 999px; font-family: var(--font-mono); font-size: 11px; font-weight: 600; }
    .loc-body { padding: 14px; }
    .loc-addr { font-size: 13px; font-weight: 600; margin-bottom: 10px; }

    /* About */
    .about-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 24px; max-width: 760px; }
    .about-lead { font-size: 16px; line-height: 1.6; }
    .about-body { font-size: 14px; line-height: 1.7; color: var(--text-muted); margin-top: 12px; }

    /* Reviews */
    .review-cta { margin-bottom: 16px; }
    .reviews-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .review-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 16px 18px; }
    .review-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
    .review-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--accent-blue); color: var(--accent-blue-text); font-weight: 600; font-size: 12px; display: grid; place-items: center; }
    .review-stars { display: inline-flex; gap: 1px; align-items: center; }
    .review-service { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.1px; }
    .review-when { margin-left: auto; font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }
    .review-body { margin: 4px 0 0; font-size: 13px; line-height: 1.5; }
    .review-reply { margin-top: 10px; padding: 10px 12px; background: var(--surface-2); border-radius: 10px; border-left: 3px solid var(--accent-blue-deep); }
    .review-reply-head { font-size: 10px; font-weight: 600; color: var(--accent-blue-text); text-transform: uppercase; letter-spacing: 1.1px; margin-bottom: 4px; }
    .review-reply-body { margin: 0; font-size: 12px; line-height: 1.5; }
    .review-actions { margin-top: 10px; }
    .review-action-delete { background: transparent; border: 1px solid rgba(192,57,43,0.4); color: var(--danger); font-family: var(--font-body); font-size: 11px; font-weight: 600; padding: 6px 10px; border-radius: 8px; cursor: pointer; }
    .review-action-delete:hover { background: rgba(192,57,43,0.06); }

    .empty { padding: 18px 0; color: var(--text-muted); font-size: 13px; }
    .empty--box { background: #fff; border: 1px dashed var(--line); border-radius: 12px; text-align: center; padding: 24px; }

    /* Responsive */
    @media (max-width: 980px) {
      .hero-inner { grid-template-columns: 1fr; }
      .hero-title { font-size: 40px; }
      .body-inner--split { grid-template-columns: 1fr; }
      .reviews-grid { grid-template-columns: 1fr; }
      .hero, .tabs, .body { padding-left: 20px; padding-right: 20px; }
    }
    @media (max-width: 560px) {
      .hero-cta { flex-direction: column; }
      .hero-cta .btn { width: 100%; }
    }
  `],
})
export class BeautyProviderDetailComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  @ViewChild('servicesTop') servicesTop?: ElementRef;

  activeTab: DetailTab = 'services';
  shareLabel = 'Share';

  constructor(
    private http: HttpClient,
    private auth: BeautyAuthService,
  ) {}

  get provider(): ProviderInfo | null {
    return (this.data['provider'] as ProviderInfo) || null;
  }
  get services(): ProviderService[] {
    return (this.data['services'] as ProviderService[]) || [];
  }
  get reviews(): ProviderReview[] {
    return (this.data['reviews'] as ProviderReview[]) || [];
  }
  get reviewCount(): number {
    const p = this.provider;
    return p && typeof p.review_count === 'number' ? p.review_count : 0;
  }
  get avgRatingDisplay(): string {
    const v = this.provider?.avg_rating;
    return v == null ? '—' : v.toFixed(1);
  }
  get canReview(): boolean {
    return !!this.data['can_review'];
  }

  get categoriesLine(): string {
    const seen = new Set<string>();
    for (const s of this.services) {
      const c = (s.category || '').trim();
      if (c) seen.add(this.toTitle(c));
    }
    return [...seen].join(' · ');
  }

  get heroHue(): string {
    for (const s of this.services) {
      const hue = CATEGORY_HUE[(s.category || '').trim().toLowerCase()];
      if (hue) return hue;
    }
    return '#5C4A3F';
  }

  get directionsUrl(): string {
    const q = encodeURIComponent(this.provider?.location_label || this.provider?.name || '');
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  scrollToServices(): void {
    this.activeTab = 'services';
    setTimeout(() => this.servicesTop?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  share(): void {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const done = () => { this.shareLabel = 'Copied!'; setTimeout(() => (this.shareLabel = 'Share'), 1800); };
    try {
      navigator.clipboard?.writeText(url).then(done, () => { /* ignore */ });
    } catch { /* clipboard unavailable */ }
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  toggleFavorite(svc: ProviderService): void {
    if (!svc?.id) return;
    const wasOn = !!svc.is_favorited;
    svc.is_favorited = !wasOn;
    const url = `${environment.apiBaseUrl}/api/beauty/protected/services/${svc.id}/favorite/`;
    const opts = { withCredentials: true, headers: this.auth.getAuthHeaders() };
    const obs = wasOn ? this.http.delete(url, opts) : this.http.post(url, {}, opts);
    obs.subscribe({ error: () => { svc.is_favorited = wasOn; } });
  }

  onDeleteReview(reviewId: number): void {
    if (!reviewId) return;
    const url = `${environment.apiBaseUrl}/api/beauty/protected/reviews/${reviewId}/`;
    this.http.delete(url, { withCredentials: true, headers: this.auth.getAuthHeaders() }).subscribe({
      next: () => {
        this.data = {
          ...this.data,
          reviews: this.reviews.filter((r) => r.id !== reviewId),
          provider: { ...(this.provider || {}), review_count: Math.max(0, this.reviewCount - 1) },
        };
        if (this.links['self']) this.followLink.emit(this.links['self']);
      },
      error: () => { /* swallow; stale until reload */ },
    });
  }

  toTitle(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
  }
}
