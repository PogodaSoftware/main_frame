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
 * "Studios near you" section is BFF-driven via `nearby_providers` from the
 * home resolver. Cards carry `_links.detail` for provider-detail navigation.
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
import { BeautySearchService } from './beauty-search.service';
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

interface NearbyProvider {
  id: number;
  name: string;
  short_description: string | null;
  location_label: string | null;
  _links: { detail: BffLink | null };
}

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

        <!-- Studios near you (BFF-driven) -->
        <section class="studios" *ngIf="nearbyProviders.length">
          <div class="section-inner">
            <div class="section-head">
              <div>
                <h2 class="section-title">Studios near you</h2>
                <p class="section-sub">Browse available studios</p>
              </div>
            </div>
            <div class="studio-grid">
              <article
                class="studio-card"
                *ngFor="let p of nearbyProviders"
                role="button"
                tabindex="0"
                [attr.aria-label]="'View ' + p.name"
                (click)="emitFollow(p._links?.detail)"
                (keydown.enter)="emitFollow(p._links?.detail)"
                style="cursor: pointer"
              >
                <div class="studio-photo">
                  <div class="studio-photo-foot">
                    <div class="studio-name">{{ p.name }}</div>
                    <div class="studio-cats" *ngIf="p.short_description">{{ p.short_description }}</div>
                  </div>
                </div>
                <div class="studio-body">
                  <div class="studio-meta">
                    <span class="studio-sub">{{ p.location_label || 'NYC' }}</span>
                  </div>
                </div>
              </article>
            </div>
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
  nearbyProviders: NearbyProvider[] = [];

  private map: any = null;
  private scriptEl: HTMLScriptElement | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private document: Document,
    private searchSvc: BeautySearchService,
  ) {}

  ngOnChanges(): void {
    this.isAuthenticated = Boolean(this.data['is_authenticated']);
    this.userEmail = (this.data['user_email'] as string) || null;
    this.googleMapsKeyPresent = Boolean(this.data['google_maps_key_present']);
    this.services = (this.data['services'] as ServiceCategory[]) || [];
    this.nearbyProviders = (this.data['nearby_providers'] as NearbyProvider[]) || [];
    const city = (this.data['user_city'] as string) || '';
    if (city) this.searchSvc.setProfileLocation(city);

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
