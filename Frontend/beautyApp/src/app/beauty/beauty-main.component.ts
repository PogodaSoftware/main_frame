/**
 * BeautyMainComponent (Presentational)
 * -------------------------------------
 * Customer-web home / discover screen. Desktop layout per the design handoff
 * `WebCustomerHome`: shared sticky CustTopNav, a marketing hero, a category
 * grid driven by the BFF `services` list, and a map card. Collapses to a
 * single-column mobile view. The React-Native app keeps its own home — this
 * is the web redesign only.
 *
 * Owns no auth or routing state. Nav + category clicks emit (followLink)
 * carrying the BFF-supplied BffLink; the shell decides NAV vs HTTP. The live
 * search (BeautyHomeSearchComponent) is projected into the top-nav search pill,
 * preserving its existing results → /book/:id behavior.
 *
 * NOTE: the design's "Studios near you" 3-up card row has no backing BFF data
 * (home payload exposes only `services` + map), so it is intentionally omitted
 * until a providers feed is added to the resolver.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { isPlatformBrowser, DOCUMENT, CommonModule } from '@angular/common';

import { BeautyHomeSearchComponent } from './beauty-home-search.component';
import { CustTopNavComponent } from './cust-web/cust-top-nav.component';
import { BffLink } from './beauty-bff.types';

declare const google: any;

interface ServiceCategory {
  icon: string;
  label: string;
  slug?: string;
  image?: string;
  count?: number;
  _links?: { category?: BffLink | null };
}

/** Demo studios for the "Studios near you" row (design handoff data — no BFF
 *  providers feed exists for the home screen yet, so these are presentational
 *  only and do not link anywhere). */
interface DemoStudio {
  name: string;
  hue: string;
  city: string;
  rating: string;
  reviews: number;
  dist: string;
  from: number;
  cats: string[];
  slots: string[];
  featured?: boolean;
  availableToday?: boolean;
  isNew?: boolean;
}

const DEMO_STUDIOS: DemoStudio[] = [
  { name: 'Indigo Studio', hue: '#5C4A3F', city: 'Brooklyn',  rating: '4.86', reviews: 142, dist: '0.4 mi', from: 35, cats: ['Facials', 'Brows', 'Lashes'], slots: ['9:30', '11:00', '1:00', '3:15', '5:00'], featured: true, availableToday: true },
  { name: 'Atelier Rouge', hue: '#A88A7A', city: 'Manhattan', rating: '4.92', reviews: 312, dist: '1.2 mi', from: 75, cats: ['Facials', 'Massage'], slots: ['10:00', '12:30', '2:45'], availableToday: true },
  { name: 'Bonsai Nails',  hue: '#7A8B6E', city: 'Brooklyn',  rating: '4.74', reviews: 88,  dist: '0.7 mi', from: 45, cats: ['Nails'], slots: ['11:30', '1:00', '3:00', '4:45'], isNew: true },
  { name: 'Loop Hair Co.', hue: '#574A3D', city: 'Queens',    rating: '4.81', reviews: 184, dist: '2.4 mi', from: 65, cats: ['Hair'], slots: ['9:00', '10:30', '2:00'], availableToday: true },
  { name: 'Salt & Steam',  hue: '#3A3A3A', city: 'Brooklyn',  rating: '4.79', reviews: 96,  dist: '1.0 mi', from: 95, cats: ['Massage'], slots: ['1:00', '4:00', '6:30'], availableToday: true },
  { name: 'Velvet Brow',   hue: '#5F5A4A', city: 'Manhattan', rating: '4.88', reviews: 142, dist: '1.8 mi', from: 55, cats: ['Brows', 'Lashes'], slots: ['11:00', '1:30', '4:00'], isNew: true },
];

type StudioFilter = 'Top rated' | 'Available today' | '$ under 50' | 'New';
const STUDIO_FILTERS: StudioFilter[] = ['Top rated', 'Available today', '$ under 50', 'New'];

@Component({
  selector: 'app-beauty-main',
  standalone: true,
  imports: [CommonModule, BeautyHomeSearchComponent, CustTopNavComponent],
  template: `
    <div class="cust-home">
      <app-cust-top-nav
        active="home"
        [links]="links"
        [signedIn]="isAuthenticated"
        [userName]="displayName"
        [userInitials]="initials"
        [userMeta]="userMeta"
        city="Brooklyn"
        (follow)="emitFollow($event)"
      >
        <app-beauty-home-search *ngIf="isAuthenticated" topnav-search></app-beauty-home-search>
      </app-cust-top-nav>

      <h1 class="sr-only">Beauty</h1>
      <main id="main" class="home-main">
        <!-- Hero -->
        <section class="hero">
          <div class="hero-inner">
            <div class="hero-copy">
              <div class="eyebrow">Spring favorites</div>
              <h2 class="hero-title">Skin that breathes,<br/>brows that frame.</h2>
              <p class="hero-sub">Glow-ups by independent studios across NYC. Real availability, instant booking, and a free cancel window every time.</p>
              <div class="hero-cta">
                <button type="button" class="btn btn--primary btn--lg" (click)="scrollToCategories()">Find your next look</button>
                <button type="button" class="btn btn--secondary btn--lg" (click)="scrollToCategories()">How it works</button>
              </div>
            </div>
            <div class="hero-feature" role="img" aria-label="Editor's pick — Indigo Studio">
              <span class="feature-badge">Editor's pick</span>
              <div class="feature-foot">
                <div class="feature-name">Indigo Studio</div>
                <div class="feature-meta">BROOKLYN · 0.4 MI · FROM $35 · ★ 4.86</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Categories (BFF services) -->
        <section class="cats" #catsSection>
          <div class="section-inner">
            <div class="section-head">
              <div>
                <h2 class="section-title">Browse by category</h2>
                <p class="section-sub">Pick a category to get started</p>
              </div>
            </div>
            <div class="cat-grid">
              <button
                *ngFor="let service of services"
                type="button"
                class="cat"
                [disabled]="!service._links?.category"
                (click)="onServiceTap(service)"
              >
                <span
                  class="cat-tile"
                  [style.background-image]="service.image ? 'url(' + service.image + ')' : null"
                ></span>
                <span class="cat-label">{{ service.label }}</span>
                <span class="cat-count" *ngIf="service.count">{{ service.count }} studios</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Studios near you (presentational demo — no home providers feed yet) -->
        <section class="studios">
          <div class="section-inner">
            <div class="section-head section-head--row">
              <div>
                <h2 class="section-title">Studios near you</h2>
                <p class="section-sub">Brooklyn, NY · within 3 mi · sorted by rating</p>
              </div>
              <div class="chips">
                <button
                  type="button"
                  class="chip"
                  [class.is-active]="activeFilter === f"
                  [attr.aria-pressed]="activeFilter === f"
                  (click)="setFilter(f)"
                  *ngFor="let f of studioFilters"
                >{{ f }}</button>
                <button type="button" class="chip chip--filter" (click)="resetFilters()" [attr.aria-label]="'Reset filters'">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18l-7 9v6l-4-2v-4L3 5z"/></svg>
                  Filters
                </button>
              </div>
            </div>
            <div class="studio-grid" *ngIf="filteredStudios.length; else noStudios">
              <article class="studio-card" *ngFor="let s of filteredStudios">
                <div class="studio-photo" [style.--hue]="s.hue">
                  <span class="studio-badge" *ngIf="s.featured">Featured</span>
                  <button type="button" class="studio-fav" aria-label="Save studio">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.5-9.5-9C1 9.5 2.5 5 7 5c2.5 0 4 1.5 5 3 1-1.5 2.5-3 5-3 4.5 0 6 4.5 4.5 7C19 16.5 12 21 12 21z"/></svg>
                  </button>
                  <div class="studio-photo-foot">
                    <div class="studio-name">{{ s.name }}</div>
                    <div class="studio-cats">{{ catsLabel(s.cats) }}</div>
                  </div>
                </div>
                <div class="studio-body">
                  <div class="studio-meta">
                    <span class="studio-rating">★ {{ s.rating }}</span>
                    <span class="studio-sub">({{ s.reviews }})</span>
                    <span class="studio-sub">· {{ s.city }} · {{ s.dist }}</span>
                    <span class="studio-from">from \${{ s.from }}</span>
                  </div>
                  <div class="studio-slots">
                    <span class="slot" *ngFor="let t of s.slots.slice(0, 4)">{{ t }}</span>
                    <span class="slot slot--more" *ngIf="s.slots.length > 4">+{{ s.slots.length - 4 }}</span>
                  </div>
                </div>
              </article>
            </div>
            <ng-template #noStudios>
              <p class="studios-empty">No studios match this filter. <button type="button" class="link-btn" (click)="resetFilters()">Clear</button></p>
            </ng-template>
          </div>
        </section>

        <!-- Map -->
        <section class="map-row">
          <div class="section-inner">
            <div class="section-head">
              <div>
                <h2 class="section-title">View on map</h2>
                <p class="section-sub">Studios near you · Brooklyn, NY</p>
              </div>
            </div>
            <div class="map-card">
              <div *ngIf="!googleMapsKeyPresent" class="map-placeholder">
                <div class="map-placeholder-content">
                  <span class="map-placeholder-icon" aria-hidden="true">🗺️</span>
                  <p>Map coming soon</p>
                  <small>GOOGLE_MAPS_API_KEY</small>
                </div>
              </div>
              <div #mapContainer class="map-container" [class.hidden]="!googleMapsKeyPresent"></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styleUrls: ['./beauty-main.component.scss'],
})
export class BeautyMainComponent implements OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @ViewChild('catsSection') catsSection!: ElementRef;

  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  isAuthenticated = false;
  userEmail: string | null = null;
  displayName = '';
  initials = '';
  userMeta = '';
  googleMapsKeyPresent = false;
  services: ServiceCategory[] = [];
  readonly studioFilters = STUDIO_FILTERS;
  activeFilter: StudioFilter = 'Top rated';

  private map: any = null;
  private scriptEl: HTMLScriptElement | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  ngOnChanges(): void {
    this.isAuthenticated = Boolean(this.data['is_authenticated']);
    this.userEmail = (this.data['user_email'] as string) || null;
    this.googleMapsKeyPresent = Boolean(this.data['google_maps_key_present']);
    this.services = (this.data['services'] as ServiceCategory[]) || [];

    const businessName = (this.data['business_name'] as string) || '';
    const userType = (this.data['user_type'] as string) || 'customer';
    this.displayName = businessName || this.nameFromEmail(this.userEmail);
    this.initials = this.initialsFrom(this.displayName);
    this.userMeta = userType === 'business' ? 'Business' : 'Customer';
  }

  private nameFromEmail(email: string | null): string {
    if (!email) return 'Account';
    const local = email.split('@')[0] || 'Account';
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  private initialsFrom(name: string): string {
    const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name.slice(0, 2) || 'ME').toUpperCase();
  }

  scrollToCategories(): void {
    this.catsSection?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  emitFollow(link: BffLink | null | undefined): void {
    if (!link) return;
    this.followLink.emit(link);
  }

  onServiceTap(service: ServiceCategory): void {
    this.emitFollow(service?._links?.category);
  }

  catsLabel(cats: string[]): string {
    return cats.join(' · ').toUpperCase();
  }

  setFilter(f: StudioFilter): void {
    this.activeFilter = f;
  }

  resetFilters(): void {
    this.activeFilter = 'Top rated';
  }

  /** Client-side filter/sort of the (presentational) studios row. */
  get filteredStudios(): DemoStudio[] {
    let list = [...DEMO_STUDIOS];
    switch (this.activeFilter) {
      case 'Available today':
        list = list.filter((s) => s.availableToday);
        break;
      case '$ under 50':
        list = list.filter((s) => s.from < 50);
        break;
      case 'New':
        list = list.filter((s) => s.isNew);
        break;
      case 'Top rated':
      default:
        break;
    }
    // Always present best-rated first.
    return list.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.googleMapsKeyPresent) {
      this.loadGoogleMapsScript();
    }
  }

  ngOnDestroy(): void {
    if (this.scriptEl?.parentNode) {
      this.scriptEl.parentNode.removeChild(this.scriptEl);
    }
  }

  private loadGoogleMapsScript(): void {
    const existing = this.document.querySelector('#google-maps-script') as HTMLScriptElement | null;
    if (existing) {
      if (typeof google !== 'undefined') {
        this.initMap();
      } else {
        existing.addEventListener('load', () => this.initMap(), { once: true });
      }
      return;
    }

    const mapsKey = (this.data['google_maps_key'] as string) || '';
    const script = this.document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => this.initMap();
    this.scriptEl = script;
    this.document.head.appendChild(script);
  }

  private initMap(): void {
    if (typeof google === 'undefined' || !this.mapContainer?.nativeElement) return;
    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: { lat: 40.7128, lng: -74.006 },
      zoom: 13,
      disableDefaultUI: false,
      gestureHandling: 'greedy',
    });
  }
}
