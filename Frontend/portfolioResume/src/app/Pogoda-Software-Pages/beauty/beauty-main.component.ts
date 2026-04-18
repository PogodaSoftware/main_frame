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
}

const HEADER_ACTION_RELS = ['login', 'signup', 'business_login', 'logout'];

@Component({
  selector: 'app-beauty-main',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="beauty-app">
      <header class="beauty-header">
        <div class="header-brand">
          <span class="brand-icon">✨</span>
          <button
            class="brand-name-btn"
            (click)="emitFollow(homeLink())"
          >Beauty</button>
        </div>
        <div class="header-actions">
          <ng-container *ngIf="isAuthenticated">
            <div *ngIf="userEmail" class="user-email-badge">{{ userEmail }}</div>
          </ng-container>
          <ng-container *ngFor="let action of headerActions">
            <button
              [class]="ctaClassFor(action.rel)"
              (click)="emitFollow(action)"
            >{{ action.prompt }}</button>
          </ng-container>
        </div>
      </header>

      <section class="services-section">
        <div class="services-scroll">
          <div *ngFor="let service of services" class="service-item">
            <div class="service-icon">{{ service.icon }}</div>
            <span class="service-label">{{ service.label }}</span>
          </div>
        </div>
      </section>

      <section class="map-section">
        <div *ngIf="!googleMapsKeyPresent" class="map-placeholder">
          <div class="map-placeholder-content">
            <span class="map-placeholder-icon">🗺️</span>
            <p>Map coming soon</p>
            <small>Add GOOGLE_MAPS_API_KEY to enable the map</small>
          </div>
        </div>
        <div #mapContainer class="map-container" [class.hidden]="!googleMapsKeyPresent"></div>
      </section>
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
  headerActions: BffLink[] = [];

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

    this.headerActions = HEADER_ACTION_RELS
      .map((rel) => this.links?.[rel])
      .filter((l): l is BffLink => Boolean(l));
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

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId) && this.googleMapsKeyPresent) {
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
