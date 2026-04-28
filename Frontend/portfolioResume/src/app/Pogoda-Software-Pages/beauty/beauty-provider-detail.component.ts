/**
 * BeautyProviderDetailComponent (Presentational)
 * ----------------------------------------------
 * Business / service-picker page — landing screen after tapping a
 * provider card. Matches the Beauty App Design System BusinessPage:
 * cover hero with category overlay, meta pills (rating, distance,
 * open status), description, white service-list card with filled
 * black Book CTAs.
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from './beauty-bff.types';

interface ProviderInfo {
  id: number;
  name: string;
  short_description: string;
  long_description: string;
  location_label: string;
  rating?: number;
  rating_count?: number;
  distance_label?: string;
  open_status?: string;
}

interface ProviderService {
  id: number;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  duration_minutes: number;
  _links?: Record<string, BffLink>;
}

@Component({
  selector: 'app-beauty-provider-detail',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="beauty-app" *ngIf="provider as p">
      <header class="sub-header">
        <button
          type="button"
          class="back-btn"
          aria-label="Back"
          (click)="emit(links['back'] || links['home'])"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="sub-header-spacer-flex"></span>
        <button
          type="button"
          class="save-btn"
          aria-label="Save provider"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14c1.5-1.5 3-3.5 3-6a4 4 0 0 0-7-2.6A4 4 0 0 0 8 8c0 2.5 1.5 4.5 3 6l4 4 4-4z"/>
          </svg>
        </button>
      </header>

      <section class="hero-cover">
        <span class="hero-tag">img · {{ heroSlug(p.name) }}</span>
        <div class="hero-overlay">
          <div class="hero-categories" *ngIf="categoriesLine">{{ categoriesLine }}</div>
          <h1 class="hero-title">{{ p.name }}</h1>
        </div>
      </section>

      <div class="scroll-body">
        <div class="meta-row">
          <span class="meta-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#F5C36B" stroke="#F5C36B" stroke-width="1" stroke-linejoin="round">
              <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z"/>
            </svg>
            <ng-container *ngIf="p.rating != null; else defaultRating">
              {{ p.rating | number:'1.1-1' }}<span *ngIf="p.rating_count"> · {{ p.rating_count }} reviews</span>
            </ng-container>
            <ng-template #defaultRating>4.9 · 218 reviews</ng-template>
          </span>
          <span class="meta-pill">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7DA8CF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {{ p.distance_label || '0.4 mi away' }}
          </span>
          <span class="meta-pill">
            <span class="status-dot"></span>
            {{ p.open_status || 'Open · closes 8 PM' }}
          </span>
        </div>

        <div class="address-line">{{ p.location_label }}</div>

        <p class="description" *ngIf="p.long_description">{{ p.long_description }}</p>

        <div class="services-head">
          <h2 class="services-title">Services</h2>
          <span class="services-count">{{ services.length }} available</span>
        </div>

        <div class="service-card">
          <div
            *ngFor="let s of services; let last = last"
            class="service-row"
            [class.is-last]="last"
          >
            <div class="service-info">
              <div class="service-name">{{ s.name }}</div>
              <div class="service-cat">{{ s.category }}</div>
              <div class="service-meta">
                <span>{{ s.duration_minutes }} min</span>
                <span class="dot">·</span>
                <span class="price">\${{ (s.price_cents / 100).toFixed(0) }}</span>
              </div>
              <div class="service-desc">{{ s.description }}</div>
            </div>
            <button
              type="button"
              class="btn-book"
              (click)="emit(s._links?.['book'])"
              [disabled]="!s._links?.['book']"
            >Book</button>
          </div>

          <div *ngIf="!services.length" class="service-empty">No services listed yet.</div>
        </div>
      </div>

      <nav class="bottom-nav">
        <button type="button" class="nav-tab" (click)="emit(links['bookings'])" [disabled]="!links['bookings']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2.5"/>
            <path d="M3 10h18M8 3v4M16 3v4"/>
          </svg>
          <span class="nav-label">Bookings</span>
        </button>
        <button type="button" class="nav-tab is-active" (click)="emit(links['home'])" [disabled]="!links['home']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 11l9-7 9 7v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9z"/>
          </svg>
          <span class="nav-label">Home</span>
        </button>
        <button type="button" class="nav-tab" (click)="emit(links['profile'])" [disabled]="!links['profile']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8.5" r="3.8"/>
            <path d="M4.5 21c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5"/>
          </svg>
          <span class="nav-label">Profile</span>
        </button>
      </nav>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --baby-blue: #CFE3F5; --baby-blue-deep: #7DA8CF;
      --ink: #0A0A0B; --success: #2F7A47; --danger: #C0392B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
    }
    * { box-sizing: border-box; }
    .beauty-app { display: flex; flex-direction: column; min-height: 100dvh; background: var(--surface); font-family: var(--font-body); color: var(--text); }

    .sub-header { display: flex; align-items: center; height: 56px; padding: 0 12px; background: var(--surface); border-bottom: 1px solid var(--line); flex-shrink: 0; }
    .back-btn, .save-btn {
      width: 36px; height: 36px; border-radius: 8px;
      background: transparent; border: none; color: var(--text);
      display: grid; place-items: center; cursor: pointer; flex-shrink: 0;
    }
    .back-btn:hover, .save-btn:hover { background: var(--surface-2); }
    .sub-header-spacer-flex { flex: 1; }

    .hero-cover {
      position: relative; height: 168px; flex-shrink: 0;
      background:
        repeating-linear-gradient(135deg, rgba(92,74,63,0.10) 0, rgba(92,74,63,0.10) 8px, rgba(92,74,63,0.16) 8px, rgba(92,74,63,0.16) 16px),
        linear-gradient(180deg, #5C4A3F 0%, #3D2F25 100%);
    }
    .hero-cover::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%);
    }
    .hero-tag {
      position: absolute; right: 12px; top: 12px; z-index: 1;
      font-family: var(--font-mono); font-size: 9px;
      color: rgba(255,255,255,0.6);
      background: rgba(0,0,0,0.3); padding: 3px 7px; border-radius: 4px;
    }
    .hero-overlay {
      position: absolute; left: 16px; right: 16px; bottom: 14px;
      color: #fff; z-index: 1;
    }
    .hero-categories {
      font-size: 10px; font-weight: 600; letter-spacing: 1.4px;
      text-transform: uppercase; opacity: 0.8; margin-bottom: 4px;
    }
    .hero-title {
      font-family: var(--font-display);
      font-size: 28px; font-weight: 500; margin: 0;
      letter-spacing: 0.2px; line-height: 1.1;
      text-shadow: 0 1px 8px rgba(0,0,0,0.35);
    }

    .scroll-body { flex: 1; overflow-y: auto; padding: 14px 20px 8px; }

    .meta-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
    .meta-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 10px; border-radius: 999px;
      background: #FFFFFF; border: 1px solid var(--line);
      font-size: 11px; font-weight: 500; color: var(--text);
      white-space: nowrap;
    }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--success); }

    .address-line { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-bottom: 10px; }
    .description { font-size: 13px; line-height: 1.55; color: var(--text); margin: 0 0 18px; opacity: 0.85; }

    .services-head {
      display: flex; align-items: baseline; justify-content: space-between;
      margin-bottom: 4px;
    }
    .services-title { font-family: var(--font-display); font-size: 22px; font-weight: 500; margin: 0; letter-spacing: 0.2px; }
    .services-count { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); }

    .service-card {
      background: #FFFFFF; border: 1px solid var(--line); border-radius: 14px;
      padding: 0 14px; margin-top: 10px; margin-bottom: 16px;
    }
    .service-row {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 0; border-bottom: 1px solid var(--line);
    }
    .service-row.is-last { border-bottom: none; }
    .service-info { flex: 1; min-width: 0; }
    .service-name {
      font-family: var(--font-display);
      font-size: 19px; font-weight: 500;
      letter-spacing: 0.2px; line-height: 1.25; margin-bottom: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .service-cat {
      font-size: 10px; font-weight: 600; color: var(--baby-blue-deep);
      text-transform: uppercase; letter-spacing: 1.2px;
      margin-bottom: 4px;
    }
    .service-meta {
      font-family: var(--font-mono); font-size: 11px;
      color: var(--text-muted); margin-bottom: 4px;
    }
    .service-meta .dot { margin: 0 6px; opacity: 0.5; }
    .service-meta .price { color: var(--text); font-weight: 600; }
    .service-desc {
      font-size: 12px; color: var(--text-muted); line-height: 1.4;
      overflow: hidden; text-overflow: ellipsis;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }

    .btn-book {
      flex-shrink: 0;
      height: 38px; padding: 0 18px; border-radius: 10px;
      background: var(--ink); color: #fff; border: 1px solid var(--ink);
      font-family: var(--font-body);
      font-size: 12px; font-weight: 600; letter-spacing: 0.2px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(15,17,21,0.18);
      transition: background-color .15s ease, border-color .15s ease;
    }
    .btn-book:hover:not(:disabled) { background: #1F1F22; border-color: #1F1F22; }
    .btn-book:disabled { opacity: 0.5; cursor: not-allowed; }

    .service-empty { padding: 18px 0; color: var(--text-muted); font-size: 13px; }

    .bottom-nav { display: flex; background: #FFFFFF; border-top: 1px solid var(--line); box-shadow: 0 -2px 14px rgba(15,35,60,0.08); flex-shrink: 0; padding-bottom: env(safe-area-inset-bottom); }
    .nav-tab { flex: 1; height: 64px; background: transparent; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; position: relative; color: var(--text); font-family: var(--font-body); }
    .nav-tab:disabled { opacity: 0.4; cursor: not-allowed; }
    .nav-tab.is-active { color: var(--baby-blue-deep); }
    .nav-dot { position: absolute; top: 6px; width: 6px; height: 6px; border-radius: 50%; background: transparent; }
    .nav-tab.is-active .nav-dot { background: var(--baby-blue-deep); }
    .nav-icon { width: 24px; height: 24px; }
    .nav-label { font-size: 0.7rem; font-weight: 500; line-height: 1; letter-spacing: 0.1px; }
    .nav-tab.is-active .nav-label { font-weight: 600; }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
  `],
})
export class BeautyProviderDetailComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get provider(): ProviderInfo | null {
    return (this.data['provider'] as ProviderInfo) || null;
  }

  get services(): ProviderService[] {
    return (this.data['services'] as ProviderService[]) || [];
  }

  get categoriesLine(): string {
    const seen = new Set<string>();
    for (const s of this.services) {
      const c = (s.category || '').trim();
      if (c) seen.add(this.toTitle(c));
    }
    return [...seen].join(' · ');
  }

  heroSlug(name: string): string {
    return (name || 'provider').toLowerCase().replace(/\s+/g, '-');
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  private toTitle(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
  }
}
