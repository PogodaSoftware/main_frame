/**
 * BeautyMainComponent (Presentational)
 * -------------------------------------
 * Renders the Beauty home screen using data + links passed from the
 * shell. Owns no auth or routing state — header buttons are generated
 * from the BFF-supplied `_links` map, so adding/removing actions like
 * "business sign in" or "logout" is purely a backend change.
 *
 * Click handlers emit (followLink) carrying the original BffLink object;
 * the shell decides whether it is a NAV (navigate) or HTTP action (POST
 * logout, etc.).
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

import { BffLink } from './beauty-bff.types';

declare const google: any;

interface ServiceCategory {
  icon: string;
  label: string;
  slug?: string;
  image?: string;
  _links?: { category?: BffLink | null };
}

const CAROUSEL_START_DELAY_MS = 2000;

// Auth-related links surface in the (now minimal) top header for signed-out users.
const HEADER_ACTION_RELS = ['login', 'signup', 'business_login'];
// Primary tabs sit in the bottom navigation pill.
const NAV_TABS: { rel: 'bookings' | 'home' | 'profile'; label: string }[] = [
  { rel: 'bookings', label: 'Bookings' },
  { rel: 'home', label: 'Home' },
  { rel: 'profile', label: 'Profile' },
];

@Component({
  selector: 'app-beauty-main',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="beauty-app">
      <header class="beauty-header" *ngIf="headerActions.length">
        <div class="header-actions">
          <button
            *ngFor="let action of headerActions"
            [class]="ctaClassFor(action.rel)"
            (click)="emitFollow(action)"
          >{{ action.prompt }}</button>
        </div>
      </header>

      <section class="services-section">
        <div
          class="services-carousel"
          [class.is-running]="carouselStarted"
          [class.is-paused]="carouselPaused"
          (mouseenter)="carouselPaused = true"
          (mouseleave)="carouselPaused = false"
        >
          <div class="services-track">
            <button
              *ngFor="let service of carouselItems; let i = index"
              type="button"
              class="carousel-item"
              [attr.aria-label]="service.label"
              [attr.aria-hidden]="i >= services.length ? 'true' : null"
              (click)="onServiceTap(service)"
            >
              <img
                class="carousel-image"
                [src]="service.image"
                [alt]="service.label"
                loading="lazy"
              />
              <span class="carousel-label">{{ service.label }}</span>
            </button>
          </div>
        </div>
      </section>

      <section class="map-section">
        <div *ngIf="!googleMapsKeyPresent" class="map-placeholder">
          <div class="map-placeholder-content">
            <span class="map-placeholder-icon">🗺️</span>
            <p>Map coming soon</p>
            <small>GOOGLE_MAPS_API_KEY</small>
          </div>
        </div>
        <div #mapContainer class="map-container" [class.hidden]="!googleMapsKeyPresent"></div>
      </section>

      <nav class="bottom-nav" *ngIf="isAuthenticated">
        <button
          *ngFor="let tab of navTabs"
          type="button"
          class="nav-tab"
          [class.is-active]="tab.rel === 'home'"
          [disabled]="!navLink(tab.rel)"
          (click)="emitFollow(navLink(tab.rel))"
          [attr.aria-current]="tab.rel === 'home' ? 'page' : null"
        >
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <ng-container [ngSwitch]="tab.rel">
              <ng-container *ngSwitchCase="'bookings'">
                <rect x="3" y="5" width="18" height="16" rx="2.5"/>
                <path d="M3 10h18M8 3v4M16 3v4"/>
              </ng-container>
              <ng-container *ngSwitchCase="'home'">
                <path d="M3 11l9-7 9 7v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9z"/>
              </ng-container>
              <ng-container *ngSwitchCase="'profile'">
                <circle cx="12" cy="8.5" r="3.8"/>
                <path d="M4.5 21c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5"/>
              </ng-container>
            </ng-container>
          </svg>
          <span class="nav-label">{{ tab.label }}</span>
        </button>
      </nav>
    </div>
  `,
  styleUrls: ['./beauty-main.component.scss'],
})
export class BeautyMainComponent implements OnChanges, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  isAuthenticated = false;
  userEmail: string | null = null;
  googleMapsKeyPresent = false;
  services: ServiceCategory[] = [];
  carouselItems: ServiceCategory[] = [];
  carouselStarted = false;
  carouselPaused = false;
  headerActions: BffLink[] = [];
  readonly navTabs = NAV_TABS;

  private map: any = null;
  private scriptEl: HTMLScriptElement | null = null;
  private carouselStartTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  ngOnChanges(): void {
    this.isAuthenticated = Boolean(this.data['is_authenticated']);
    this.userEmail = (this.data['user_email'] as string) || null;
    this.googleMapsKeyPresent = Boolean(this.data['google_maps_key_present']);
    this.services = (this.data['services'] as ServiceCategory[]) || [];
    // Duplicate the list so the CSS keyframe can translate by -50% for a
    // seamless infinite loop without items popping back in view.
    this.carouselItems = [...this.services, ...this.services];

    this.headerActions = HEADER_ACTION_RELS
      .map((rel) => this.links?.[rel])
      .filter((l): l is BffLink => Boolean(l));
  }

  navLink(rel: 'bookings' | 'home' | 'profile'): BffLink | null {
    if (rel === 'home') return this.homeLink();
    return this.links[rel] || null;
  }

  homeLink(): BffLink {
    return (
      this.links['self'] ||
      this.links['home'] || {
        rel: 'home',
        href: null,
        method: 'NAV',
        screen: 'beauty_home',
        route: '/pogoda/beauty',
        prompt: 'Beauty',
      }
    );
  }

  ctaClassFor(rel: string): string {
    switch (rel) {
      case 'login':
        return 'btn-login';
      case 'signup':
        return 'btn-signup';
      case 'business_login':
        return 'btn-business-login';
      case 'logout':
        return 'btn-logout';
      default:
        return 'btn-link';
    }
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
    // Carousel idles for 5s after the home screen mounts, then auto-scrolls.
    this.carouselStartTimer = setTimeout(() => {
      this.carouselStarted = true;
    }, CAROUSEL_START_DELAY_MS);
  }

  ngOnDestroy(): void {
    if (this.scriptEl?.parentNode) {
      this.scriptEl.parentNode.removeChild(this.scriptEl);
    }
    if (this.carouselStartTimer) {
      clearTimeout(this.carouselStartTimer);
      this.carouselStartTimer = null;
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
